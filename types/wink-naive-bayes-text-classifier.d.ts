declare module '~wink-naive-bayes-text-classifier/index' {
  export default class Classifier {
    computeOdds(value: string): Array<[string, number]>
    consolidate(): boolean
    defineConfig(config: Partial<{ considerOnlyPresence: boolean; smoothing: number }>): boolean
    definePrepTasks(tasks: Function[]): number
    evaluate(input: string, label: string): boolean
    exportJSON(): string
    importJSON(json: string): boolean
    learn(input: string | string[], label: string): boolean
    metrics(): object
    predict(input: string | string[]): string
    reset(): boolean
    stats(): object
  }
}

declare module 'wink-naive-bayes-text-classifier' {
  import alias = require('~wink-naive-bayes-text-classifier/index')
  export = alias
}
