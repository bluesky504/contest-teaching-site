var gatheringElement = "fire";
var attackSpell = "fire-arrow";
var attackCost = 3;

hero.chooseItem = function (collector) {
  return gatheringElement;
};

hero.spawnCollector();

while (true) {
  var availableMana = hero.getTotalMana(gatheringElement);
  if (availableMana >= attackCost && hero.canCast(attackSpell)) {
    hero.cast(attackSpell);
  }
}
