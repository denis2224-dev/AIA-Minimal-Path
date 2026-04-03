// CLI test runner for the A* / Dijkstra pathfinder
// Usage: ./astar_cli <nodes.csv> <edges.csv> <src_id> <dst_id>

#include "astar.h"

#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main(int argc, char **argv)
{
    if (argc != 5) {
        fprintf(stderr, "Usage: %s <nodes.csv> <edges.csv> <src_id> <dst_id>\n", argv[0]);
        return 1;
    }

    const char *nodes_path = argv[1];
    const char *edges_path = argv[2];
    int src = atoi(argv[3]);
    int dst = atoi(argv[4]);

    // Load graph
    Graph *g = graph_create(nodes_path, edges_path);
    if (!g) {
        fprintf(stderr, "[ERROR] Failed to load graph.\n");
        return 1;
    }

    if (src < 0 || src >= g->n || dst < 0 || dst >= g->n) {
        fprintf(stderr, "[ERROR] Node IDs out of range (0..%d)\n", g->n - 1);
        graph_destroy(g);
        return 1;
    }

    int *path = (int *)malloc(sizeof(int) * g->n);
    int path_len = 0, expanded = 0;

    // Run A*
    clock_t t0 = clock();
    float dist_a = astar_search(g, src, dst, path, &path_len, &expanded);
    clock_t t1 = clock();
    double time_a = (double)(t1 - t0) / CLOCKS_PER_SEC;

    if (dist_a < 0) {
        printf("A*:       no path found\n");
    } else {
        printf("A*:       distance=%.1f m  nodes_in_path=%d  time=%.3fs  expanded=%d\n",
               dist_a, path_len, time_a, expanded);
    }

    // Run Dijkstra
    int path_len_d = 0, expanded_d = 0;
    clock_t t2 = clock();
    float dist_d = dijkstra_search(g, src, dst, path, &path_len_d, &expanded_d);
    clock_t t3 = clock();
    double time_d = (double)(t3 - t2) / CLOCKS_PER_SEC;

    if (dist_d < 0) {
        printf("Dijkstra: no path found\n");
    } else {
        printf("Dijkstra: distance=%.1f m  nodes_in_path=%d  time=%.3fs  expanded=%d\n",
               dist_d, path_len_d, time_d, expanded_d);
    }

    // Sanity check: both algorithms must agree on distance
    if (dist_a >= 0 && dist_d >= 0) {
        float diff = dist_a - dist_d;
        if (diff < 0) diff = -diff;
        if (diff > 1.0f) {
            fprintf(stderr, "\n[WARNING] Distance mismatch: A*=%.1f  Dijkstra=%.1f  (diff=%.1f)\n",
                    dist_a, dist_d, diff);
        } else {
            printf("\n[OK] Both algorithms agree on distance (diff=%.2f m)\n", diff);
        }
    }

    free(path);
    graph_destroy(g);
    return 0;
}
