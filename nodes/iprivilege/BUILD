load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "iprivilege",
    data = ["tachyons.min.4.12.0.css"],
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
        "@npm//@types/express",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//date-fns",
        "@npm//express",
        "@npm//node-red",
        "@npm//zod",
    ],
)
