load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "smarterqueue",
    test_data = [],
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
        "@npm//human-interval",
        "@npm//date-fns",
        "@npm//@types/human-interval",
    ],
    deps = [
        "//nodes:worker_node",
        "//types",
        "@npm//@types/express",
        "@npm//@types/human-interval",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//date-fns",
        "@npm//human-interval",
        "@npm//node-red",
        "@npm//zod",
    ],
)
