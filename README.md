# Node-red

Smart automation.

## Running locally

You can run the project locally and automatically restart the server when there is a change with:

```bash
npm start
```

## Reading files from the `node_modules` folder

You should use the Bazel's helper:

```ts
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']!)
if (runfiles) {
  const myNicePackageNameFolderInBazel = runfiles.resolve('npm//my-package-name')
}
```

## Writing a node from scratch

You should create a folder in the `node` directory with the name of the node.

Let's assume it's `my-first-node`.

Create the following files:

```bash
$ tree my-first-node
my-first-node
├── BUILD
├── my-first-node.common.ts
├── my-first-node.html
├── my-first-node.lib.ts
├── my-first-node.test.ts
└── my-first-node.ts
```

Here's a breakdown of the files:

- `my-first-node.html` [defines how the node appears in the editor.](https://nodered.org/docs/creating-nodes/node-html)
- `my-first-node.ts` [contains the node constructor](https://nodered.org/docs/creating-nodes/node-js). Notice how none of the logic of the node is placed in this file. Instead, all the logic is in the `my-first-node.lib.ts` file.
- `my-first-node.lib.ts` contains the logic for the node.
- `my-first-node.test.ts` the test file for the node. It has to be there even if it's empty.
- `my-first-node.common.ts` defines the input and output of the node. Those are the messages that can be consumed and emitted by the node.
- `BUILD` — the Bazel build file in charge of compiling the node.

## How to test a node

The simplest way to test a node is to create a flow with three nodes:

1. An inject node to inject a message.
1. Your node.
1. A debug node. Make sure that you toggle the node to output the full message and not just the payload.

## Node architecture

All messages that are routed to the node are queued up.

The node picks up a message and runs it to completion.

After that, it consumes a new message from the queue or waits for new messages.

The code for such a queue mechanism is encapsulated in the [worker-node.ts](nodes/worker-node.ts) file.

Messaged that are received and sent are checked for validity using [zod](https://github.com/colinhacks/zod).

Validating message is necessary since it's sometimes hard to predict what data is generated by the node.

## Managing state

Nodes that have to have state should use the [context](https://nodered.org/docs/creating-nodes/context).

It's important to notice that most of the documentation assumes that you will use the built-in context that is in-memory only.

Unfortunately, this project uses [the async filesystem context](https://nodered.org/docs/user-guide/writing-functions#asynchronous-context-access).

An excellent example of using the async context is available in the [nodes/circular-buffer/circular-buffer.lib.ts](nodes/circular-buffer/circular-buffer.lib.ts) file.

There are two things that you should notice:

1. The context is always wrapped into the `asyncContext(node.context())` function and **never** used directly.
1. The context is passed from the node constructor into the `xxx.lib.ts` file.

## Sending and receiving messages

All messages have the following structure:

1. A `topic` field with a string defined the topic's name and the version. Example `FETCH.V1`.
1. An optional `payload` with the data that is passed to the node.

Messages are divided into two categories:

- Actions — Those are the input messages.
- Events — Those are the output.

All actions and events are checked with [zod](https://github.com/colinhacks/zod) for validity.

This is by design to prevent hard to spot bugs where the messages are _almost_ compliant.

All actions and events are stored in the `xxx.common.ts` file.

## Usual and unusual use cases

- Sometimes you might need to add a field to the editor and read the value for it. The [reddit-scraper node](nodes/reddit-scraper) is a good example of how you should [customise the html](nodes/reddit-scraper/reddit-scraper.html) and include the fields in the [node constructor](nodes/reddit-scraper/reddit-scraper.ts).
- You might need to store sensitive data. The [iPrivilege node](nodes/iprivilege) has an example of how you can [define a password field in the html](nodes/iprivilege/iprivilege.html) and read it in the [node constructor](nodes/iprivilege/iprivilege.ts).
- If your tests require fixtures, you might need to add them to the `BUILD` file. The [reddit-scraper node](nodes/reddit-scraper/BUILD) has an example on how you can do that.
- If your code requires external files such as CSS or images, you might need to include that into your `BUILD` file. The [iPrivilege node](nodes/iprivilege/BUILD) includes an example of how you can do that with CSS.
- For a few nodes, you might be tempted to build your HTML and HTTP routes. The iPrivilege node includes an example of [how you can add (private) routes](nodes/iprivilege/iprivilege.ts) and how you can [add a button to the editor to open the interface.](nodes/iprivilege/iprivilege.html)
- If you're using Axios to fetch data from external services, you should consider using the `axios` module that includes a function for printing the errors called `prettyAxiosErrors`. A good example of `prettyAxiosErrors` is available in the [iprivilege node.](nodes/iprivilege/iprivilege.lib.ts)
