load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "my-first-node",
    test_data = [],
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//packages/worker_node",
        "//types",
        "@npm//@types/node",
        "@npm//node-red",
        "@npm//zod",
    ],
)
