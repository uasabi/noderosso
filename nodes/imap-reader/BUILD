load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "imap-reader",
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//nodes:worker_node",
        "//types",
        "@npm//@types/mailparser",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//emailjs-imap-client",
        "@npm//mailparser",
        "@npm//node-red",
        "@npm//zod",
    ],
)
