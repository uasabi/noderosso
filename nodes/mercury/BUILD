load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "mercury",
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//nodes:axios",
        "//nodes:worker_node",
        "//summarice",
        "//types",
        "@npm//@mozilla/readability",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//hast-util-raw",
        "@npm//hast-util-select",
        "@npm//node-red",
        "@npm//puppeteer-core",
        "@npm//puppeteer-extra",
        "@npm//puppeteer-extra-plugin-adblocker",
        "@npm//puppeteer-extra-plugin-stealth",
        "@npm//zod",
    ],
)
