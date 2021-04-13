load("@io_bazel_rules_docker//nodejs:image.bzl", "nodejs_image")
load("@io_bazel_rules_docker//container:container.bzl", "container_image", "container_push")
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

package(default_visibility = ["//visibility:public"])

NODES = [
    "//nodes/circular-buffer",
    "//nodes/classifier",
    "//nodes/eventbrite",
    "//nodes/feedparse",
    "//nodes/gcalendar",
    "//nodes/imap-reader",
    "//nodes/iprivilege",
    "//nodes/link-store",
    "//nodes/lru-cache",
    "//nodes/mercury",
    "//nodes/my-first-node",
    "//nodes/postgres",
    "//nodes/reddit-scraper",
    "//nodes/smarterqueue",
    "//nodes/twitter",
    "//nodes/tweet-importer",
    "//nodes/web-watcher",
    "//nodes/wordpress-scraper",
]

NODE_RED_PACKAGES = [
    "@npm//node-red-contrib-rss",
    "@npm//node-red-contrib-sendgrid",
    "@npm//node-red-contrib-telegrambot",
]

exports_files([
    "tsconfig.json",
    "package.json",
    ".prettierrc.js",
])

filegroup(
    name = "entry_file",
    srcs = [
        "node_modules/node-red/red.js",
    ],
)

nodejs_binary(
    name = "node-red",
    args = [
        "--settings",
        "settings.js",
        "flows.json",
    ],
    data = [
        "flows.json",
        "settings.js",
    ] + NODES + NODE_RED_PACKAGES,
    entry_point = "@npm//:node_modules/node-red/red.js",
)

container_image(
    name = "nodejs_base_image",
    base = "@nodejs_base_image//image",
)

nodejs_image(
    name = "server",
    args = [
        "--userDir",
        "/noderosso",
    ],
    base = ":nodejs_base_image",
    data = [
        "start.sh",
        "@npm//node-red",
    ] + NODES + NODE_RED_PACKAGES,
    entry_point = "@npm//:node_modules/node-red/red.js",
)

container_push(
    name = "upload",
    format = "Docker",
    image = ":server",
    registry = "learnk8sregistry.azurecr.io",
    repository = "noderosso",
    tag = "2021.04.012",
)

test_suite(
    name = "all",
    tests = [
        "//nodes:tslint",
        "//summarice:summarice_test",
    ] + ["{}:test".format(n) for n in NODES] + ["{}:tslint".format(n) for n in NODES],
)
