import { 
  JevStateSnapshot, 
  JevEvaluationResponse, 
  JevActionType 
} from '@escape-the-matrix/shared-types';
import { config } from '../../config/index.js';

export async function evaluateJevState(snapshot: JevStateSnapshot): Promise<JevEvaluationResponse> {
  // If API key is available, attempt call via Vercel AI SDK
  if (config.aiGatewayApiKey && config.aiGatewayApiKey.startsWith('vck_')) {
    let timer: NodeJS.Timeout | undefined;
    try {
      const aiModule = await import('ai') as any;
      const evaluate = aiModule.experimental_evaluate || aiModule.evaluate;

      if (typeof evaluate === 'function') {
        const stateDescription = `Sector ${snapshot.sectorId} (${snapshot.directives} directive). Jev at (${snapshot.jevPosition.x}, ${snapshot.jevPosition.y}), HP: ${snapshot.jevHealth}, Energy: ${snapshot.jevEnergy}. Keycards: [${snapshot.keycards.join(', ')}]. Time Remaining: ${snapshot.timeRemaining}s. Alert: ${snapshot.matrixAlert}%. Enemies nearby: ${snapshot.enemies.length}. Target Glitch: (${snapshot.targetGlitch.x}, ${snapshot.targetGlitch.y}).`;

        const timeoutPromise = new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), 1500);
        });

        const evalPromise = evaluate({
          model: 'typesafe-ai/jev',
          state: stateDescription,
          questions: {
            detectionRisk: {
              type: 'number',
              instructions: 'Calculate probability of detection from 0.0 (safe) to 1.0 (spotted).',
            },
            recommendedAction: {
              type: 'choice',
              options: ['MOVE_STEALTH', 'MOVE_SPRINT', 'HACK_GATE', 'HACK_TERMINAL', 'USE_EMP', 'USE_DECOY', 'WAIT'],
              instructions: 'Select optimal autonomous action based on risk and time remaining.',
            },
            tacticalThought: {
              type: 'string',
              instructions: 'Provide concise 1-sentence internal AI reasoning log for the player HUD.',
            },
          },
        }).catch(() => null);

        const response: any = await Promise.race([evalPromise, timeoutPromise]);
        if (timer) clearTimeout(timer);
        
        if (response && response.questions) {
          return {
            detectionRisk: typeof response.questions.detectionRisk === 'number' 
              ? response.questions.detectionRisk 
              : 0.1,
            recommendedAction: (response.questions.recommendedAction as JevActionType) || 'MOVE_STEALTH',
            tacticalThought: (response.questions.tacticalThought as string) || 'Autonomous matrix traversal protocol active.',
          };
        }
      }
    } catch {
      if (timer) clearTimeout(timer);
    }
  }

  // Fast, deterministic tactical AI fallback evaluator
  return evaluateLocalTacticalHeuristic(snapshot);
}

/**
 * Deterministic local heuristic evaluation tree
 */
export function evaluateLocalTacticalHeuristic(snapshot: JevStateSnapshot): JevEvaluationResponse {
  const closestEnemyDist = snapshot.enemies.length > 0
    ? Math.min(...snapshot.enemies.map((e) => e.distanceToJev))
    : 99;

  let risk = 0.05;
  if (closestEnemyDist <= 1) risk = 0.95;
  else if (closestEnemyDist <= 2) risk = 0.75;
  else if (closestEnemyDist <= 3) risk = 0.45;
  else if (closestEnemyDist <= 4) risk = 0.20;

  // Decision logic
  let action: JevActionType = 'MOVE_STEALTH';
  let thought = 'Scanning sector topography. Keeping noise footprint suppressed.';

  if (risk >= 0.75 && snapshot.jevEnergy >= 50) {
    action = 'USE_EMP';
    thought = `Hostile proximity critical (${Math.round(risk * 100)}% detection). Priming Overdrive EMP shockwave!`;
  } else if (snapshot.nearbyHazards.some(h => h.type === 'GATE')) {
    action = 'HACK_GATE';
    thought = 'Security gate encountered. Executing cryptographic bypass sequence.';
  } else if (snapshot.nearbyHazards.some(h => h.type === 'TERMINAL') && snapshot.directives === 'SCAVENGER') {
    action = 'HACK_TERMINAL';
    thought = 'Accessing high-value Data Node to extract upgrade credits.';
  } else if (snapshot.timeRemaining <= 15 || snapshot.directives === 'SPRINT') {
    action = 'MOVE_SPRINT';
    thought = `Lockdown imminent in ${snapshot.timeRemaining}s. Initiating high-velocity sprint to Extraction Glitch.`;
  } else if (risk > 0.4) {
    action = 'MOVE_STEALTH';
    thought = `Hostile patrol detected within ${closestEnemyDist} tiles. Engaging shadow navigation.`;
  } else {
    action = 'MOVE_STEALTH';
    thought = `Optimal trajectory plotted toward extraction vector (${snapshot.targetGlitch.x}, ${snapshot.targetGlitch.y}).`;
  }

  return {
    detectionRisk: risk,
    recommendedAction: action,
    tacticalThought: thought,
  };
}
