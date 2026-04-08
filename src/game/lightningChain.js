import { spawnPoolParticle } from "./engine.js";

export function onLightningHit(state, bullet, firstTarget) {
  let currentTarget = firstTarget;
  let remainingChains = bullet.chains || 0;
  let currentDmg = bullet.dmg * 0.8;
  const hitTargets = new Set([firstTarget]);
  const chainLinks = [{ from: { x: bullet.x, y: bullet.y }, to: { x: firstTarget.x, y: firstTarget.y } }];

  while (remainingChains > 0) {
    let nearest = null, minDist = bullet.chainRange;

    state.meteors.forEach(target => {
      if (hitTargets.has(target)) return;
      const d = Math.hypot(target.x - currentTarget.x, target.y - currentTarget.y);
      if (d < minDist) { minDist = d; nearest = target; }
    });
    state.enemies.forEach(target => {
      if (hitTargets.has(target)) return;
      const d = Math.hypot(target.x - currentTarget.x, target.y - currentTarget.y);
      if (d < minDist) { minDist = d; nearest = target; }
    });
    if (state.bossActive && state.bossState === "fighting") {
      const bossTarget = { x: state.bossX, y: state.bossY, _isBoss: true };
      if (!hitTargets.has(bossTarget)) {
        const d = Math.hypot(state.bossX - currentTarget.x, state.bossY - currentTarget.y);
        if (d < minDist) { minDist = d; nearest = bossTarget; }
      }
    }

    if (!nearest) break;

    if (nearest._isBoss) {
      if (!state.bossInvulnerable) {
        const dmg = Math.floor(10 * currentDmg * (state.bossDamageMultiplier || 1));
        state.bossHP -= dmg;
        chainParticles(state, state.bossX, state.bossY);
      }
    } else {
      nearest.hp -= currentDmg;
      chainParticles(state, nearest.x, nearest.y);
    }

    hitTargets.add(nearest);
    chainLinks.push({
      from: { x: currentTarget.x, y: currentTarget.y },
      to: { x: nearest.x, y: nearest.y },
    });

    currentTarget = nearest;
    currentDmg *= 0.8;
    remainingChains--;
  }

  if (chainLinks.length > 0) {
    state.lightningArcs.push({ links: chainLinks, timer: 12, maxTimer: 12 });
  }
}

function chainParticles(state, x, y) {
  for (let i = 0; i < 4; i++) {
    spawnPoolParticle(
      x, y,
      (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3,
      0.8, 0.04, 2, "#88ddff"
    );
  }
}
