export const arrayShuffler = (shuffled: string[], type: string) =>
  shuffled.reduce((acc, _item, ix) => {
    const increment = type === 'gifts' ? 1 : 2

    const n =
      ix + increment > shuffled.length - 1
        ? ix + increment - shuffled.length
        : ix + increment

    acc[ix] = shuffled[n]

    return acc
  }, {} as { [key: string]: string })
