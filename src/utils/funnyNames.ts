/** Deterministic funny username from a wallet address */
export function generateFunnyName(walletAddress: string): string {
  const adjectives = [
    "sneaky", "chunky", "wobbly", "crispy", "spicy",
    "fluffy", "grumpy", "bouncy", "salty", "dizzy",
    "sleepy", "cheeky", "wonky", "zappy", "groovy",
    "nerdy", "peppy", "quirky", "sassy", "wacky",
    "jazzy", "zippy", "funky", "goofy", "loopy",
    "nutty", "rowdy", "snazzy", "toasty", "yappy",
    "breezy", "clumsy", "daring", "feisty", "hasty",
    "jolly", "lanky", "moody", "plucky", "rusty",
  ];

  const nouns = [
    "pickle", "waffle", "noodle", "pretzel", "taco",
    "muffin", "nugget", "walrus", "penguin", "potato",
    "burrito", "dumpling", "sardine", "wombat", "badger",
    "llama", "otter", "panda", "sloth", "falcon",
    "goblin", "wizard", "pirate", "ninja", "viking",
    "yeti", "dragon", "kraken", "sphinx", "bandit",
    "captain", "legend", "degen", "whale", "ape",
    "chad", "maverick", "rascal", "rocket", "thunder",
  ];

  // Simple hash from wallet address
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    hash = ((hash << 5) - hash + walletAddress.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);

  const adj = adjectives[absHash % adjectives.length];
  const noun = nouns[(absHash >> 8) % nouns.length];
  const num = (absHash % 99) + 1;

  return `${adj}_${noun}${num}`;
}
