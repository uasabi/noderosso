load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "feedparse",
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//nodes:axios",
        "//nodes:worker_node",
        "//types",
        "@npm//@types/node",
        "@npm//human-interval",
        "@npm//node-red",
        "@npm//rss-parser",
        "@npm//zod",
        "@npm//chrono-node",
    ],
)
