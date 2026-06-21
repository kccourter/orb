import type { NormalizedScenario } from "../api/scenarios";
import type { TleInput } from "../orbits/tle";

export const DEFAULT_SCENARIO_ID = "iss-tle";

export type ScenarioDisplayMode = "tle-preview" | "sample-display";

export type ActiveScenarioState = {
  scenario: NormalizedScenario;
  displayMode: ScenarioDisplayMode;
  activeTle?: TleInput;
};

export function stateFromNormalizedScenario(
  scenario: NormalizedScenario,
): ActiveScenarioState {
  if (scenario.source.type === "tle" && scenario.tle) {
    return {
      scenario,
      displayMode: "tle-preview",
      activeTle: {
        name: scenario.name,
        source: scenario.source.objectId
          ? `${scenario.name} ${scenario.source.objectId}`
          : scenario.name,
        line1: scenario.tle.line1,
        line2: scenario.tle.line2,
      },
    };
  }

  return {
    scenario,
    displayMode: "sample-display",
  };
}
