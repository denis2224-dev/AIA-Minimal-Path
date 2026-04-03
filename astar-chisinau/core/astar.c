// A* and Dijkstra over a CSR street graph

#include "astar.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <float.h>

// Constants

#define EARTH_RADIUS_M 6371000.0
#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Haversine distance (metres)

static inline double deg2rad(double d) { return d * (M_PI / 180.0); }

// Returns the straight-line distance in metres between two lat/lon points
static float haversine(double lat1, double lon1, double lat2, double lon2)
{
    double rlat1 = deg2rad(lat1), rlon1 = deg2rad(lon1);
    double rlat2 = deg2rad(lat2), rlon2 = deg2rad(lon2);
    double dlat  = rlat2 - rlat1;
    double dlon  = rlon2 - rlon1;
    double a = sin(dlat / 2) * sin(dlat / 2)
             + cos(rlat1) * cos(rlat2) * sin(dlon / 2) * sin(dlon / 2);
    return (float)(EARTH_RADIUS_M * 2.0 * asin(sqrt(a)));
}

// Binary min-heap with decrease-key
// heap[] = array of (node, f-value) pairs
// pos[node] = index in heap[], or -1 if not present

typedef struct {
    int   node;
    float f;
} HeapNode;

typedef struct {
    HeapNode *data;
    int      *pos;
    int       size;
    int       cap;
} MinHeap;

// Allocate a heap that can hold up to 'capacity' nodes
static MinHeap *heap_create(int capacity)
{
    MinHeap *h = (MinHeap *)malloc(sizeof(MinHeap));
    h->data = (HeapNode *)malloc(sizeof(HeapNode) * capacity);
    h->pos  = (int *)malloc(sizeof(int) * capacity);
    h->size = 0;
    h->cap  = capacity;
    for (int i = 0; i < capacity; i++) h->pos[i] = -1;
    return h;
}

static void heap_free(MinHeap *h)
{
    free(h->data);
    free(h->pos);
    free(h);
}

// Swap two heap entries and update position map
static inline void heap_swap(MinHeap *h, int a, int b)
{
    HeapNode tmp = h->data[a];
    h->data[a]   = h->data[b];
    h->data[b]   = tmp;
    h->pos[h->data[a].node] = a;
    h->pos[h->data[b].node] = b;
}

// Bubble up to restore the min-heap property
static void heap_bubble_up(MinHeap *h, int idx)
{
    while (idx > 0) {
        int parent = (idx - 1) / 2;
        if (h->data[parent].f <= h->data[idx].f) break;
        heap_swap(h, parent, idx);
        idx = parent;
    }
}

// Bubble down to restore the min-heap property
static void heap_bubble_down(MinHeap *h, int idx)
{
    int n = h->size;
    for (;;) {
        int smallest = idx;
        int left  = 2 * idx + 1;
        int right = 2 * idx + 2;
        if (left  < n && h->data[left].f  < h->data[smallest].f) smallest = left;
        if (right < n && h->data[right].f < h->data[smallest].f) smallest = right;
        if (smallest == idx) break;
        heap_swap(h, idx, smallest);
        idx = smallest;
    }
}

// Push a node or decrease its key if already in the heap
static void heap_push_or_decrease(MinHeap *h, int node, float f)
{
    int idx = h->pos[node];
    if (idx >= 0) {
        // Already in heap, decrease key
        if (f < h->data[idx].f) {
            h->data[idx].f = f;
            heap_bubble_up(h, idx);
        }
        return;
    }
    // Insert new entry at the end
    idx = h->size++;
    h->data[idx].node = node;
    h->data[idx].f    = f;
    h->pos[node]      = idx;
    heap_bubble_up(h, idx);
}

// Pop the node with the smallest f-value
static float heap_pop(MinHeap *h, int *out_node)
{
    HeapNode top = h->data[0];
    *out_node = top.node;
    float f   = top.f;
    h->pos[top.node] = -1;
    h->size--;
    if (h->size > 0) {
        h->data[0] = h->data[h->size];
        h->pos[h->data[0].node] = 0;
        heap_bubble_down(h, 0);
    }
    return f;
}

// CSV graph loader

// Read a full line from a file into a malloc'd buffer
static char *read_line(FILE *fp)
{
    int cap = 256, len = 0;
    char *buf = (char *)malloc(cap);
    int c;
    while ((c = fgetc(fp)) != EOF && c != '\n') {
        if (len + 1 >= cap) { cap *= 2; buf = (char *)realloc(buf, cap); }
        buf[len++] = (char)c;
    }
    if (len == 0 && c == EOF) { free(buf); return NULL; }
    // Strip trailing \r (Windows line endings)
    if (len > 0 && buf[len - 1] == '\r') len--;
    buf[len] = '\0';
    return buf;
}

// Count lines in a file (excluding the header)
static int count_data_lines(const char *path)
{
    FILE *fp = fopen(path, "r");
    if (!fp) return -1;
    int count = -1; // start at -1 to skip header
    int c;
    int at_line_start = 1;
    while ((c = fgetc(fp)) != EOF) {
        if (at_line_start) { count++; at_line_start = 0; }
        if (c == '\n') at_line_start = 1;
    }
    if (!at_line_start) count++; /* last line without newline */
    fclose(fp);
    return count < 0 ? 0 : count;
}

// Load graph from nodes.csv and edges.csv into a CSR Graph structure
Graph *graph_create(const char *nodes_path, const char *edges_path)
{
    // Count nodes and edges
    int n = count_data_lines(nodes_path);
    int m = count_data_lines(edges_path);
    if (n <= 0 || m <= 0) {
        fprintf(stderr, "[ERROR] Cannot read graph CSVs (nodes=%d, edges=%d)\n", n, m);
        return NULL;
    }

    Graph *g = (Graph *)calloc(1, sizeof(Graph));
    g->n = n;
    g->m = m;
    g->lat    = (double *)calloc(n, sizeof(double));
    g->lon    = (double *)calloc(n, sizeof(double));
    g->name   = (char **)calloc(n, sizeof(char *));
    g->offsets = (int *)calloc(n + 1, sizeof(int));
    g->to     = (int *)malloc(sizeof(int) * m);
    g->weight = (float *)malloc(sizeof(float) * m);

    FILE *fp = fopen(nodes_path, "r");
    if (!fp) { fprintf(stderr, "[ERROR] Cannot open %s\n", nodes_path); graph_destroy(g); return NULL; }
    char *line = read_line(fp); 
    free(line);

    for (int i = 0; i < n; i++) {
        line = read_line(fp);
        if (!line) break;
        // Parse: id,lat,lon,name
        int id; double lat, lon;
        char namebuf[512] = {0};
        // Find first three commas
        char *p1 = strchr(line, ',');
        if (p1) {
            *p1 = '\0'; id = atoi(line);
            char *p2 = strchr(p1 + 1, ',');
            if (p2) {
                *p2 = '\0'; lat = atof(p1 + 1);
                char *p3 = strchr(p2 + 1, ',');
                if (p3) {
                    *p3 = '\0'; lon = atof(p2 + 1);
                    strncpy(namebuf, p3 + 1, sizeof(namebuf) - 1);
                } else {
                    lon = atof(p2 + 1);
                }
            } else {
                lat = atof(p1 + 1);
            }
        } else {
            id = atoi(line);
            lat = lon = 0;
        }
        if (id >= 0 && id < n) {
            g->lat[id]  = lat;
            g->lon[id]  = lon;
            g->name[id] = strdup(namebuf);
        }
        free(line);
    }
    fclose(fp);

    // Read edges (two-pass: count per source, then fill)
    // First pass: count outgoing edges per node to build offsets
    int *deg = (int *)calloc(n, sizeof(int));

    fp = fopen(edges_path, "r");
    if (!fp) { fprintf(stderr, "[ERROR] Cannot open %s\n", edges_path); free(deg); graph_destroy(g); return NULL; }
    line = read_line(fp); free(line); // skip header

    // Temporary edge storage
    int *eu = (int *)malloc(sizeof(int) * m);
    int *ev = (int *)malloc(sizeof(int) * m);
    float *ew = (float *)malloc(sizeof(float) * m);
    int edge_idx = 0;

    for (int i = 0; i < m; i++) {
        line = read_line(fp);
        if (!line) break;
        int u, v, w;
        if (sscanf(line, "%d,%d,%d", &u, &v, &w) == 3) {
            eu[edge_idx] = u;
            ev[edge_idx] = v;
            ew[edge_idx] = (float)w;
            if (u >= 0 && u < n) deg[u]++;
            edge_idx++;
        }
        free(line);
    }
    fclose(fp);
    g->m = edge_idx; // actual edge count

    // Build offset array (prefix sum of degrees)
    g->offsets[0] = 0;
    for (int i = 0; i < n; i++) {
        g->offsets[i + 1] = g->offsets[i] + deg[i];
    }

    // Second pass: fill to[] and weight[] using a write cursor per node
    int *cursor = (int *)calloc(n, sizeof(int));
    for (int i = 0; i < edge_idx; i++) {
        int u = eu[i];
        int pos = g->offsets[u] + cursor[u];
        g->to[pos]     = ev[i];
        g->weight[pos] = ew[i];
        cursor[u]++;
    }

    free(eu); free(ev); free(ew);
    free(deg); free(cursor);

    printf("[INFO] Graph loaded: %d nodes, %d edges\n", g->n, g->m);
    return g;
}

void graph_destroy(Graph *g)
{
    if (!g) return;
    free(g->offsets);
    free(g->to);
    free(g->weight);
    free(g->lat);
    free(g->lon);
    if (g->name) {
        for (int i = 0; i < g->n; i++) free(g->name[i]);
        free(g->name);
    }
    free(g);
}

// A* search
// Uses Haversine distance as an admissible heuristic
// Maintains g-values and reconstructs the path via a predecessor array

float astar_search(const Graph *g, int src, int dst,
                   int *path, int *path_len, int *expanded)
{
    int n = g->n;
    if (src < 0 || src >= n || dst < 0 || dst >= n) return -1.0f;

    float *gval = (float *)malloc(sizeof(float) * n);
    int   *prev = (int *)malloc(sizeof(int) * n);
    char  *closed = (char *)calloc(n, 1);

    for (int i = 0; i < n; i++) { gval[i] = FLT_MAX; prev[i] = -1; }
    gval[src] = 0.0f;

    MinHeap *heap = heap_create(n);
    float h0 = haversine(g->lat[src], g->lon[src], g->lat[dst], g->lon[dst]);
    heap_push_or_decrease(heap, src, h0);

    int exp_count = 0;
    float result = -1.0f;

    while (heap->size > 0) {
        int u;
        heap_pop(heap, &u);

        if (closed[u]) continue;
        closed[u] = 1;
        exp_count++;

        // Goal reached, reconstruct path
        if (u == dst) {
            result = gval[dst];
            int len = 0;
            for (int v = dst; v != -1; v = prev[v]) len++;
            *path_len = len;
            int idx = len - 1;
            for (int v = dst; v != -1; v = prev[v]) path[idx--] = v;
            break;
        }

        // Relax neighbours
        for (int e = g->offsets[u]; e < g->offsets[u + 1]; e++) {
            int v = g->to[e];
            if (closed[v]) continue;
            float tentative = gval[u] + g->weight[e];
            if (tentative < gval[v]) {
                gval[v] = tentative;
                prev[v] = u;
                float h = haversine(g->lat[v], g->lon[v],
                                    g->lat[dst], g->lon[dst]);
                heap_push_or_decrease(heap, v, tentative + h);
            }
        }
    }

    if (expanded) *expanded = exp_count;

    heap_free(heap);
    free(gval); free(prev); free(closed);
    return result;
}

// Dijkstra search (same as A* but heuristic is always 0)

float dijkstra_search(const Graph *g, int src, int dst,
                      int *path, int *path_len, int *expanded)
{
    int n = g->n;
    if (src < 0 || src >= n || dst < 0 || dst >= n) return -1.0f;

    float *dist = (float *)malloc(sizeof(float) * n);
    int   *prev = (int *)malloc(sizeof(int) * n);
    char  *closed = (char *)calloc(n, 1);

    for (int i = 0; i < n; i++) { dist[i] = FLT_MAX; prev[i] = -1; }
    dist[src] = 0.0f;

    MinHeap *heap = heap_create(n);
    heap_push_or_decrease(heap, src, 0.0f);

    int exp_count = 0;
    float result = -1.0f;

    while (heap->size > 0) {
        int u;
        heap_pop(heap, &u);

        if (closed[u]) continue;
        closed[u] = 1;
        exp_count++;

        if (u == dst) {
            result = dist[dst];
            int len = 0;
            for (int v = dst; v != -1; v = prev[v]) len++;
            *path_len = len;
            int idx = len - 1;
            for (int v = dst; v != -1; v = prev[v]) path[idx--] = v;
            break;
        }

        for (int e = g->offsets[u]; e < g->offsets[u + 1]; e++) {
            int v = g->to[e];
            if (closed[v]) continue;
            float tentative = dist[u] + g->weight[e];
            if (tentative < dist[v]) {
                dist[v] = tentative;
                prev[v] = u;
                heap_push_or_decrease(heap, v, tentative);
            }
        }
    }

    if (expanded) *expanded = exp_count;

    heap_free(heap);
    free(dist); free(prev); free(closed);
    return result;
}

// Shared-library API (FFI entry points for Python ctypes)

EXPORT void *graph_load(const char *nodes_path, const char *edges_path)
{
    return (void *)graph_create(nodes_path, edges_path);
}

EXPORT float graph_astar(void *handle, int src, int dst,
                         int *result_nodes, int *result_len,
                         int *nodes_expanded)
{
    Graph *g = (Graph *)handle;
    if (!g) return -1.0f;
    return astar_search(g, src, dst, result_nodes, result_len, nodes_expanded);
}

EXPORT float graph_dijkstra(void *handle, int src, int dst,
                            int *result_nodes, int *result_len,
                            int *nodes_expanded)
{
    Graph *g = (Graph *)handle;
    if (!g) return -1.0f;
    return dijkstra_search(g, src, dst, result_nodes, result_len, nodes_expanded);
}

EXPORT void graph_node_latlon(void *handle, int node_id,
                              double *lat, double *lon)
{
    Graph *g = (Graph *)handle;
    if (!g || node_id < 0 || node_id >= g->n) return;
    *lat = g->lat[node_id];
    *lon = g->lon[node_id];
}

EXPORT int graph_node_count(void *handle)
{
    Graph *g = (Graph *)handle;
    return g ? g->n : 0;
}

EXPORT const char *graph_node_name(void *handle, int node_id)
{
    Graph *g = (Graph *)handle;
    if (!g || node_id < 0 || node_id >= g->n) return "";
    return g->name[node_id] ? g->name[node_id] : "";
}

EXPORT void graph_free(void *handle)
{
    graph_destroy((Graph *)handle);
}
