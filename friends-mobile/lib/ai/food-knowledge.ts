/**
 * Food Knowledge Base
 *
 * Comprehensive mapping of foods to their ingredients and dietary properties
 * Used for intelligent conflict detection (e.g., "allergic to potatoes" → "can't eat fries")
 */

export interface FoodItem {
  name: string;
  ingredients: string[];
  categories: string[];
  aliases: string[];
}

export interface DietaryRestriction {
  name: string;
  excludedIngredients: string[];
  excludedCategories: string[];
  description: string;
}

/**
 * Common food ingredients and their derivatives
 */
export const INGREDIENT_DERIVATIVES: Record<string, string[]> = {
  // Dairy
  milk: ['cream', 'butter', 'cheese', 'yogurt', 'whey', 'casein', 'lactose', 'ghee', 'ice cream'],
  dairy: [
    'milk',
    'cream',
    'butter',
    'cheese',
    'yogurt',
    'whey',
    'casein',
    'lactose',
    'ghee',
    'ice cream',
  ],

  // Eggs
  eggs: ['mayonnaise', 'meringue', 'custard', 'hollandaise'],

  // Meat
  beef: ['steak', 'hamburger', 'meatballs', 'beef broth', 'gelatin'],
  pork: ['bacon', 'ham', 'sausage', 'prosciutto', 'pepperoni', 'salami', 'pork chops'],
  chicken: ['chicken breast', 'chicken wings', 'chicken broth', 'chicken stock'],
  meat: ['beef', 'pork', 'chicken', 'turkey', 'lamb', 'veal', 'duck', 'bacon', 'ham', 'sausage'],

  // Seafood
  fish: ['salmon', 'tuna', 'cod', 'trout', 'halibut', 'sardines', 'anchovies'],
  shellfish: ['shrimp', 'crab', 'lobster', 'oysters', 'clams', 'mussels', 'scallops'],
  seafood: ['fish', 'shellfish', 'shrimp', 'crab', 'lobster', 'salmon', 'tuna'],

  // Nuts
  nuts: [
    'peanuts',
    'almonds',
    'walnuts',
    'cashews',
    'pecans',
    'pistachios',
    'hazelnuts',
    'peanut butter',
    'almond butter',
  ],
  peanuts: ['peanut butter', 'peanut oil'],
  almonds: ['almond butter', 'almond milk', 'marzipan'],

  // Gluten
  gluten: ['wheat', 'barley', 'rye', 'bread', 'pasta', 'beer', 'flour', 'seitan'],
  wheat: ['bread', 'pasta', 'flour', 'couscous', 'semolina', 'crackers'],

  // Vegetables
  potato: [
    'fries',
    'french fries',
    'chips',
    'potato chips',
    'hash browns',
    'mashed potatoes',
    'baked potato',
    'potato salad',
  ],
  tomato: ['ketchup', 'marinara', 'tomato sauce', 'salsa', 'pizza sauce'],

  // Soy
  soy: ['tofu', 'tempeh', 'soy sauce', 'edamame', 'miso', 'soy milk'],

  // Sugar
  sugar: ['honey', 'syrup', 'molasses', 'agave'],
};

/**
 * Common foods with their ingredient breakdown
 */
export const FOOD_DATABASE: Record<string, FoodItem> = {
  // Potato-based
  fries: {
    name: 'fries',
    ingredients: ['potato', 'oil', 'salt'],
    categories: ['fried', 'side-dish', 'fast-food'],
    aliases: ['french fries', 'chips'],
  },
  'french fries': {
    name: 'french fries',
    ingredients: ['potato', 'oil', 'salt'],
    categories: ['fried', 'side-dish', 'fast-food'],
    aliases: ['fries', 'chips'],
  },
  'potato chips': {
    name: 'potato chips',
    ingredients: ['potato', 'oil', 'salt'],
    categories: ['snack', 'fried'],
    aliases: ['chips', 'crisps'],
  },
  'mashed potatoes': {
    name: 'mashed potatoes',
    ingredients: ['potato', 'milk', 'butter'],
    categories: ['side-dish'],
    aliases: ['mash'],
  },
  'hash browns': {
    name: 'hash browns',
    ingredients: ['potato', 'oil', 'onion'],
    categories: ['breakfast', 'fried'],
    aliases: [],
  },

  // Dairy-based
  'ice cream': {
    name: 'ice cream',
    ingredients: ['milk', 'cream', 'sugar'],
    categories: ['dessert', 'frozen', 'dairy'],
    aliases: ['gelato'],
  },
  cheese: {
    name: 'cheese',
    ingredients: ['milk', 'rennet'],
    categories: ['dairy'],
    aliases: ['cheddar', 'mozzarella', 'parmesan'],
  },
  pizza: {
    name: 'pizza',
    ingredients: ['wheat', 'cheese', 'tomato'],
    categories: ['italian', 'fast-food'],
    aliases: [],
  },
  'mac and cheese': {
    name: 'mac and cheese',
    ingredients: ['wheat', 'cheese', 'milk'],
    categories: ['pasta', 'comfort-food'],
    aliases: ['macaroni and cheese'],
  },

  // Meat-based
  hamburger: {
    name: 'hamburger',
    ingredients: ['beef', 'wheat', 'lettuce', 'tomato'],
    categories: ['fast-food', 'sandwich'],
    aliases: ['burger'],
  },
  bacon: {
    name: 'bacon',
    ingredients: ['pork', 'salt'],
    categories: ['meat', 'breakfast'],
    aliases: ['streaky bacon'],
  },
  'hot dog': {
    name: 'hot dog',
    ingredients: ['pork', 'beef', 'wheat'],
    categories: ['fast-food'],
    aliases: ['hotdog'],
  },
  'pepperoni pizza': {
    name: 'pepperoni pizza',
    ingredients: ['wheat', 'cheese', 'tomato', 'pork'],
    categories: ['italian', 'fast-food'],
    aliases: [],
  },

  // Seafood
  'fish and chips': {
    name: 'fish and chips',
    ingredients: ['fish', 'potato', 'wheat', 'oil'],
    categories: ['seafood', 'fried', 'british'],
    aliases: [],
  },
  sushi: {
    name: 'sushi',
    ingredients: ['fish', 'rice', 'seaweed'],
    categories: ['seafood', 'japanese'],
    aliases: [],
  },

  // Vegan/Vegetarian
  'veggie burger': {
    name: 'veggie burger',
    ingredients: ['vegetables', 'wheat'],
    categories: ['vegetarian', 'sandwich'],
    aliases: [],
  },
  tofu: {
    name: 'tofu',
    ingredients: ['soy'],
    categories: ['vegan', 'protein'],
    aliases: ['bean curd'],
  },

  // Breakfast
  'eggs benedict': {
    name: 'eggs benedict',
    ingredients: ['eggs', 'wheat', 'butter', 'pork'],
    categories: ['breakfast'],
    aliases: [],
  },
  omelette: {
    name: 'omelette',
    ingredients: ['eggs', 'cheese'],
    categories: ['breakfast', 'eggs'],
    aliases: ['omelet'],
  },

  // Desserts
  'chocolate cake': {
    name: 'chocolate cake',
    ingredients: ['wheat', 'eggs', 'milk', 'sugar', 'chocolate'],
    categories: ['dessert', 'baked'],
    aliases: [],
  },
  cheesecake: {
    name: 'cheesecake',
    ingredients: ['cheese', 'eggs', 'sugar', 'wheat'],
    categories: ['dessert'],
    aliases: [],
  },
};

/**
 * Dietary restrictions and their rules
 */
export const DIETARY_RESTRICTIONS: Record<string, DietaryRestriction> = {
  vegan: {
    name: 'vegan',
    excludedIngredients: ['meat', 'dairy', 'eggs', 'honey', 'gelatin'],
    excludedCategories: ['meat', 'dairy', 'eggs'],
    description: 'No animal products',
  },
  vegetarian: {
    name: 'vegetarian',
    excludedIngredients: ['meat', 'fish', 'seafood', 'gelatin'],
    excludedCategories: ['meat', 'seafood'],
    description: 'No meat or fish',
  },
  pescatarian: {
    name: 'pescatarian',
    excludedIngredients: ['meat', 'pork', 'beef', 'chicken'],
    excludedCategories: ['meat'],
    description: 'No meat (fish is OK)',
  },
  'lactose intolerant': {
    name: 'lactose intolerant',
    excludedIngredients: ['milk', 'dairy', 'lactose'],
    excludedCategories: ['dairy'],
    description: 'No dairy products',
  },
  kosher: {
    name: 'kosher',
    excludedIngredients: ['pork', 'shellfish'],
    excludedCategories: [],
    description: 'Jewish dietary laws',
  },
  halal: {
    name: 'halal',
    excludedIngredients: ['pork', 'alcohol'],
    excludedCategories: [],
    description: 'Islamic dietary laws',
  },
  'gluten-free': {
    name: 'gluten-free',
    excludedIngredients: ['gluten', 'wheat', 'barley', 'rye'],
    excludedCategories: [],
    description: 'No gluten',
  },
  'nut allergy': {
    name: 'nut allergy',
    excludedIngredients: ['nuts', 'peanuts', 'almonds', 'walnuts'],
    excludedCategories: [],
    description: 'Allergic to nuts',
  },
};

/**
 * Simple singularization for common food ingredients
 */
function singularize(word: string): string {
  // Handle common plural forms
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y'; // berries -> berry
  }
  if (word.endsWith('oes')) {
    return word.slice(0, -2); // potatoes -> potato, tomatoes -> tomato
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1); // nuts -> nut, but not glass -> glas
  }
  return word;
}

/**
 * Normalize food name for matching
 */
export function normalizeFoodName(name: string): string {
  const normalized = name.toLowerCase().trim();
  // Try both the original and singularized form
  return normalized;
}

/**
 * Get both singular and plural forms for matching
 */
function getForms(name: string): string[] {
  const normalized = normalizeFoodName(name);
  const singular = singularize(normalized);

  if (singular !== normalized) {
    return [normalized, singular];
  }
  return [normalized];
}

/**
 * Get all ingredients for a food item (including derivatives)
 */
export function getAllIngredients(foodName: string): string[] {
  const normalized = normalizeFoodName(foodName);

  // Check if it's in our database
  const foodItem = FOOD_DATABASE[normalized];
  if (foodItem) {
    // Expand ingredients to include derivatives
    const allIngredients = new Set<string>();

    for (const ingredient of foodItem.ingredients) {
      allIngredients.add(ingredient);

      // Add derivatives
      const derivatives = INGREDIENT_DERIVATIVES[ingredient] || [];
      derivatives.forEach((d) => allIngredients.add(d));
    }

    return Array.from(allIngredients);
  }

  // If not in database, check if it's a known ingredient
  if (INGREDIENT_DERIVATIVES[normalized]) {
    return [normalized, ...INGREDIENT_DERIVATIVES[normalized]];
  }

  // Unknown food - just return the name itself
  return [normalized];
}

/**
 * Check if a food contains an ingredient (with derivative checking)
 */
export function foodContainsIngredient(foodName: string, ingredient: string): boolean {
  const foodForms = getForms(foodName);
  const ingredientForms = getForms(ingredient);

  // Direct match (any form)
  if (foodForms.some((f) => ingredientForms.includes(f))) {
    return true;
  }

  // Check if food is in database (try all forms)
  for (const foodForm of foodForms) {
    const foodItem = FOOD_DATABASE[foodForm];
    if (foodItem) {
      // Check direct ingredients (try all forms of ingredient)
      if (
        foodItem.ingredients.some((ing) => {
          const ingForms = getForms(ing);
          return ingredientForms.some((ingf) => ingForms.includes(ingf));
        })
      ) {
        return true;
      }

      // Check if any ingredient has the queried ingredient as a derivative
      for (const ing of foodItem.ingredients) {
        const ingForms = getForms(ing);
        for (const ingForm of ingForms) {
          const derivatives = INGREDIENT_DERIVATIVES[ingForm] || [];
          if (derivatives.some((d) => ingredientForms.some((ingf) => getForms(d).includes(ingf)))) {
            return true;
          }
        }
      }

      // Check aliases
      if (
        foodItem.aliases.some((alias) =>
          ingredientForms.some((ingf) => getForms(alias).includes(ingf))
        )
      ) {
        return true;
      }
    }
  }

  // Check if the ingredient's derivatives include this food (try all forms)
  for (const ingredientForm of ingredientForms) {
    const ingredientDerivatives = INGREDIENT_DERIVATIVES[ingredientForm] || [];
    if (ingredientDerivatives.some((d) => foodForms.some((ff) => getForms(d).includes(ff)))) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a food is compatible with a dietary restriction
 */
export function isFoodCompatibleWithRestriction(
  foodName: string,
  restriction: string
): { compatible: boolean; reason?: string } {
  const normalizedRestriction = normalizeFoodName(restriction);
  const dietaryRestriction = DIETARY_RESTRICTIONS[normalizedRestriction];

  if (!dietaryRestriction) {
    // Unknown restriction, can't determine
    return { compatible: true };
  }

  const foodIngredients = getAllIngredients(foodName);

  // Check if any food ingredient is in the excluded list
  for (const excludedIngredient of dietaryRestriction.excludedIngredients) {
    if (foodIngredients.some((ing) => foodContainsIngredient(ing, excludedIngredient))) {
      return {
        compatible: false,
        reason: `Contains ${excludedIngredient} (${dietaryRestriction.description})`,
      };
    }
  }

  return { compatible: true };
}

/**
 * Find all foods that conflict with an allergy or restriction
 */
export function findConflictingFoods(
  allergyOrRestriction: string,
  foodsList: string[]
): Array<{ food: string; reason: string }> {
  const conflicts: Array<{ food: string; reason: string }> = [];
  const normalized = normalizeFoodName(allergyOrRestriction);

  for (const food of foodsList) {
    // Check if it's a dietary restriction
    if (DIETARY_RESTRICTIONS[normalized]) {
      const { compatible, reason } = isFoodCompatibleWithRestriction(food, allergyOrRestriction);
      if (!compatible && reason) {
        conflicts.push({ food, reason });
      }
    } else {
      // Treat as allergy/ingredient restriction
      if (foodContainsIngredient(food, allergyOrRestriction)) {
        conflicts.push({
          food,
          reason: `Contains ${allergyOrRestriction}`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Get dietary restriction implications
 * e.g., "vegan" implies cannot eat "dairy", "eggs", "meat"
 */
export function getDietaryImplications(restriction: string): string[] {
  const normalized = normalizeFoodName(restriction);
  const dietaryRestriction = DIETARY_RESTRICTIONS[normalized];

  if (!dietaryRestriction) {
    return [];
  }

  return dietaryRestriction.excludedIngredients;
}
