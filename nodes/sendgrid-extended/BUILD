load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "sendgrid-extended",
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
        "@npm//@sendgrid/mail",
        "@npm//node-red",
        "@npm//zod",
    ],
)
