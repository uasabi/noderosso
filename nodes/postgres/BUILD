load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "postgres",
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
        "@npm//@types/pg",
        "@npm//node-red",
        "@npm//pg",
        "@npm//zod",
    ],
)
