"""prettier
"""

load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary", "nodejs_test")
load("@npm//@bazel/typescript:index.bzl", "ts_library")

def prettier_test(
        name,
        srcs = [],
        data = [],
        deps = [],
        expected_exit_code = 0,
        tags = [],
        **kwargs):
    templated_args = ["$(rootpath :{})".format(n) for n in srcs]
    all_data = data + srcs + deps + [
        "//:.prettierrc.js",
        "@npm//prettier",
    ]
    nodejs_test(
        name = name,
        templated_args = ["-c", ".prettierrc.js"] + templated_args,
        data = all_data,
        expected_exit_code = expected_exit_code,
        entry_point = "@npm//:node_modules/prettier/bin-prettier.js",
    )

def prettier(
        name,
        srcs = [],
        data = [],
        deps = [],
        expected_exit_code = 0,
        tags = [],
        **kwargs):
    templated_args = ["$(rootpath :{})".format(n) for n in srcs]
    all_data = data + srcs + deps + [
        "//:.prettierrc.js",
        "@npm//prettier",
    ]
    nodejs_binary(
        name = name,
        templated_args = ["-c", ".prettierrc.js", "--write"] + templated_args,
        data = all_data,
        entry_point = "@npm//:node_modules/prettier/bin-prettier.js",
    )

ALL_IMAGES = [
    "*.svg",
    "*.png",
    "*.gif",
    "*.jpg",
    "**/assets/*.svg",
    "**/assets/*.png",
    "**/assets/*.gif",
    "**/assets/*.jpg",
]

ALL_MARKDOWN = ["*.md", "**/*.md"]

ALL_OTHER_ASSETS = [
    "*.js",
    "*.pdf",
    "assets/*.pdf",
]

def node(name = "", deps = [], data = [], test_deps = [], test_data = []):
    native.filegroup(
        name = "files",
        srcs = native.glob(
            ["*.ts"],
            exclude = ["*.test.ts", "test.ts"],
        ),
        data = [name + ".html"] + data,
    )

    ts_library(
        name = name,
        srcs = [":files"],
        deps = deps,
    )

    native.filegroup(
        name = "test_files",
        srcs = [name + ".test.ts"],
    )

    ts_library(
        name = "tests_ts",
        srcs = [":test_files"],
        deps = [
            ":" + name,
        ] + test_deps,
        data = test_data,
    )

    nodejs_test(
        name = "test",
        data = [":tests_ts"],
        entry_point = ":" + name + ".test.ts",
    )

    native.filegroup(
        name = "all_ts_files",
        srcs = native.glob(["*.ts"]),
    )

    prettier_test(
        name = "tslint",
        srcs = native.glob([
            "*.ts",
            "*.tsx",
        ]),
    )

    prettier(
        name = "tsfmt",
        srcs = native.glob([
            "*.ts",
            "*.tsx",
        ]),
    )
