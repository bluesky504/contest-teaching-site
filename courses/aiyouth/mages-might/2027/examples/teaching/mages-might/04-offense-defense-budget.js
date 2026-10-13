var attackElement = "fire";
var attackSpell = "fire-ball";
var attackCost = 15;
var shieldElement = "water";
var shieldSpell = "water-shield";
var shieldCost = 3;
var shieldUsed = false;

hero.chooseItem = function (collector) {
  return attackElement;
};

while (true) {
  var attackMana = hero.getTotalMana(attackElement);
  var shieldMana = hero.getTotalMana(shieldElement);
  var incoming = hero.findEnemyMissiles();
  var hasArrayObservation = Array.isArray(incoming);
  var hasIncoming = hasArrayObservation && incoming.length > 0;
  var incomingMana = hasIncoming && incoming[0] ? incoming[0].mana : null;

  if (hasIncoming && incomingMana === "fire" && !shieldUsed && shieldMana >= shieldCost && hero.canCast(shieldSpell)) {
    hero.cast(shieldSpell);
    shieldUsed = true;
  } else if (hasArrayObservation && !hasIncoming && attackMana >= attackCost && hero.canCast(attackSpell)) {
    hero.cast(attackSpell);
  }
}
