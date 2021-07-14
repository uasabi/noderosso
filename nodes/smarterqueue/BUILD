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
        "@npm//date-fns",
        "@npm//rrule",
    ],
    deps = [
        "//packages/worker_node",
        "//packages/context",
        "//types",
        "@npm//@types/express",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//date-fns",
        "@npm//human-interval",
        "@npm//node-red",
        "@npm//rrule",
        "@npm//zod",
    ],
)
