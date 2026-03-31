#ifndef ASTAR_H
#define ASTAR_H

#ifdef __cplusplus
extern "C" {
#endif

/* ── Portable export macro ─────────────────────────────────────────────── */
#ifdef _WIN32
#  define EXPORT __declspec(dllexport)
#else
#  define EXPORT __attribute__((visibility("default")))
#endif

/* ── CSR graph ─────────────────────────────────────────────────────────── */
typedef struct {
    int    n;          /* number of nodes                                  */
    int    m;          /* number of directed edges                         */
    int   *offsets;    /* offsets[i]..offsets[i+1]-1 = neighbour range     */
    int   *to;         /* destination node for each edge                   */
    float *weight;     /* edge weight in meters                            */
    double *lat;       /* latitude of each node                            */
    double *lon;       /* longitude of each node                           */
    char  **name;      /* street name of each node (may be NULL / empty)   */
} Graph;

/* ── Algorithm result (internal) ───────────────────────────────────────── */
typedef struct {
    float  distance;       /* total path distance in meters, -1 if none    */
    int    path_len;       /* number of nodes in the path                  */
    int    nodes_expanded; /* nodes popped from the priority queue         */
} AstarResult;

/* ── Internal API ──────────────────────────────────────────────────────── */

/* Load a graph from CSV files. Returns NULL on failure. */
Graph *graph_create(const char *nodes_path, const char *edges_path);

/* Free all memory associated with a graph. */
void   graph_destroy(Graph *g);

/* Run A*. path must be pre-allocated with at least g->n entries.
   Returns total distance in metres, or -1 if unreachable.
   Fills path[] and *path_len with the node-id sequence.
   *expanded receives the number of nodes popped from the heap. */
float  astar_search(const Graph *g, int src, int dst,
                    int *path, int *path_len, int *expanded);

/* Dijkstra reference implementation – same signature as astar_search. */
float  dijkstra_search(const Graph *g, int src, int dst,
                       int *path, int *path_len, int *expanded);

/* ── Shared-library API (called from Python ctypes / FFI) ──────────────── */

/* Load graph; returns opaque handle. */
EXPORT void *graph_load(const char *nodes_path, const char *edges_path);

/* Run A*. Writes node-id path into result_nodes, length into *result_len.
   Returns distance in metres or -1. */
EXPORT float graph_astar(void *handle, int src, int dst,
                         int *result_nodes, int *result_len,
                         int *nodes_expanded);

/* Run Dijkstra. Same semantics. */
EXPORT float graph_dijkstra(void *handle, int src, int dst,
                            int *result_nodes, int *result_len,
                            int *nodes_expanded);

/* Retrieve lat/lon for a single node. */
EXPORT void  graph_node_latlon(void *handle, int node_id,
                               double *lat, double *lon);

/* Return number of nodes in the graph. */
EXPORT int   graph_node_count(void *handle);

/* Return node name (pointer to internal string — do not free). */
EXPORT const char *graph_node_name(void *handle, int node_id);

/* Free the graph handle. */
EXPORT void  graph_free(void *handle);

#ifdef __cplusplus
}
#endif

#endif /* ASTAR_H */
