import * as nlp from 'wink-nlp-utils'
import distance from 'wink-distance'

export function summarice(
  text: string | string[],
): {
  minScore: number
  maxScore: number
  sentence: string
  bagOfWords: Record<string, number>
  normalisedScore: number
}[] {
  const sentences = (Array.isArray(text) ? text : [text])
    .flatMap((it) => nlp.string.sentences(it ?? ''))
    .map((it) => `${it}`.trim())
    .filter((it) => it.length > 0)

  if (sentences.length === 0) {
    return []
  }

  const scoredSentences = computeSimilarity(sentences, 3)
  const { peaks } = findPeaksAndTroughs(scoredSentences, (it) => it.normalisedScore)
  const groupSentences = splitByIndexes(scoredSentences, peaks)

  return groupSentences.flatMap((it) => {
    return {
      ...it.sort((a, b) => a.normalisedScore - b.normalisedScore)[0]!,
      minScore: Math.min.apply(
        null,
        it.map((it) => it.normalisedScore),
      ),
      maxScore: Math.max.apply(
        null,
        it.map((it) => it.normalisedScore),
      ),
    }
  })
}

export function computeSimilarity(
  sentences: string[],
  window = 3,
): Array<{ sentence: string; bagOfWords: Record<string, number>; normalisedScore: number }> {
  return sentences
    .map((sentence) => {
      return {
        sentence,
        bagOfWords: nlp.tokens.bagOfWords(pipeline(sentence)),
      }
    })
    .map((it, i, array) => {
      const bagOfWords = it.bagOfWords
      const halfWindow = Math.ceil(window / 2)
      const startsFromIndex = Math.max(i - halfWindow, 0)
      const endsWithIndex = Math.min(i + halfWindow, array.length - 1)
      let cumulativeScore = 0
      for (let currentIndex = startsFromIndex; currentIndex <= endsWithIndex; currentIndex++) {
        if (currentIndex === i) {
          continue
        }
        const score = distance.bow.cosine(bagOfWords, array[currentIndex]!.bagOfWords)
        cumulativeScore = cumulativeScore + score
      }
      return {
        ...it,
        normalisedScore: cumulativeScore / (endsWithIndex - startsFromIndex + 1),
      }
    })
}

function pipeline(input: string): string[] {
  let output = nlp.string.tokenize0(input)
  output = nlp.tokens.removeWords(output)
  output = nlp.tokens.stem(output)
  return output
}

export function findPeaksAndTroughs<T>(array: T[], fn: (i: T) => number): { peaks: number[]; troughs: number[] } {
  const start = 1 // Starting index to search
  const end = array.length - 2 // Last index to search
  const peaks = [] as number[]
  const troughs = [] as number[]

  for (let i = start; i <= end; i++) {
    let current = fn(array[i]!)
    let last = fn(array[i - 1]!)
    let next = fn(array[i + 1]!)

    if (current > next && current > last) peaks.push(i)
    else if (current < next && current < last) troughs.push(i)
  }
  return { peaks, troughs }
}

export function splitByIndexes<T>(sentences: T[], troughs: number[]): Array<T[]> {
  const groups = []
  let sliceFrom = 0
  for (let i = 0; i <= troughs.length; i++) {
    let sliceUntil = troughs[i] ?? sentences.length
    groups.push(sentences.slice(sliceFrom, sliceUntil + 1))
    sliceFrom = sliceUntil
  }
  return groups
}
