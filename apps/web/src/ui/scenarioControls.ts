import type {
  NormalizedScenario,
  ScenarioExampleSummary,
} from "../api/scenarios";

export type ScenarioControlsStatus =
  | {
      status: "loading";
      message?: string;
    }
  | {
      status: "ready";
      scenario: NormalizedScenario;
    }
  | {
      status: "error";
      message: string;
    };

export type ScenarioControls = {
  element: HTMLElement;
  setExamples: (examples: readonly ScenarioExampleSummary[]) => void;
  setStatus: (status: ScenarioControlsStatus) => void;
};

export function createScenarioControls(
  onLoadExample: (exampleId: string) => void,
): ScenarioControls {
  const form = document.createElement("form");
  form.className = "scenario-controls";
  form.setAttribute("aria-label", "Scenario controls");

  const label = document.createElement("label");
  label.className = "scenario-controls__field";

  const labelText = document.createElement("span");
  labelText.className = "scenario-controls__label";
  labelText.textContent = "Scenario";

  const select = document.createElement("select");
  select.className = "scenario-controls__select";
  select.dataset.testid = "scenario-select";

  label.append(labelText, select);

  const loadButton = document.createElement("button");
  loadButton.type = "submit";
  loadButton.className = "scenario-controls__button";
  loadButton.textContent = "Load";
  loadButton.dataset.testid = "load-scenario";

  const status = document.createElement("span");
  status.className = "scenario-controls__status";
  status.textContent = "Loading scenarios";
  status.dataset.testid = "scenario-status";

  const metadata = document.createElement("dl");
  metadata.className = "scenario-controls__metadata";
  metadata.dataset.testid = "scenario-metadata";
  metadata.append(
    metadataTerm("Source"),
    metadataValue("--"),
    metadataTerm("Frame"),
    metadataValue("--"),
    metadataTerm("Samples"),
    metadataValue("--"),
  );

  form.append(label, loadButton, status, metadata);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!select.value) {
      return;
    }

    onLoadExample(select.value);
  });

  return {
    element: form,
    setExamples(examples) {
      select.replaceChildren(
        ...examples.map((example) => {
          const option = document.createElement("option");
          option.value = example.id;
          option.textContent = example.name;
          return option;
        }),
      );
      select.disabled = examples.length === 0;
      loadButton.disabled = examples.length === 0;
    },
    setStatus(nextStatus) {
      form.dataset.status = nextStatus.status;
      loadButton.disabled = nextStatus.status === "loading" || select.disabled;

      if (nextStatus.status === "loading") {
        status.textContent = nextStatus.message ?? "Loading scenario";
        return;
      }

      if (nextStatus.status === "error") {
        status.textContent = nextStatus.message;
        return;
      }

      const { scenario } = nextStatus;
      status.textContent = `${scenario.name} loaded`;
      setMetadata(metadata, scenario);
    },
  };
}

function metadataTerm(text: string) {
  const term = document.createElement("dt");
  term.textContent = text;
  return term;
}

function metadataValue(text: string) {
  const value = document.createElement("dd");
  value.textContent = text;
  return value;
}

function setMetadata(metadata: HTMLElement, scenario: NormalizedScenario) {
  const values = metadata.querySelectorAll("dd");
  const sampleCount = scenario.samples.length;

  values[0].textContent = scenario.source.type;
  values[1].textContent = `${scenario.frame.name} ${scenario.frame.origin}`;
  values[2].textContent = String(sampleCount || (scenario.initialState ? 1 : 0));
}
