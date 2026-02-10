export const birdDecks = {
  balanced: ['red', 'red', 'yellow', 'blue', 'black'],
  speedrun: ['yellow', 'yellow', 'blue', 'red', 'white'],
  demolition: ['black', 'red', 'black', 'yellow', 'red'],
  tactical: ['blue', 'white', 'yellow', 'red', 'black'],
};

export const getDeckName = (index) => {
  const names = Object.keys(birdDecks);
  return names[index % names.length];
};
