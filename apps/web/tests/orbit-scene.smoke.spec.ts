import { expect, type Page, test } from "@playwright/test";

test("renders the orbit scene to a nonblank canvas", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("#scene");
  await expect(canvas).toBeVisible();

  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);
});

test("recomputes the orbit from sampling controls", async ({ page }) => {
  await page.goto("/");

  const epochInput = page.getByTestId("epoch-input");
  const durationInput = page.getByTestId("duration-input");
  const stepInput = page.getByTestId("step-input");
  const resetButton = page.getByTestId("reset-settings");

  await expect(epochInput).toHaveValue("2024-06-21T13:31:24Z");
  await expect(durationInput).toHaveValue("92.5");
  await expect(stepInput).toHaveValue("30");

  await durationInput.fill("120");
  await durationInput.blur();
  await expect(durationInput).toHaveValue("120");
  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);

  await resetButton.click();
  await expect(durationInput).toHaveValue("92.5");
  await expect(stepInput).toHaveValue("30");
  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);
});

test("requests Orekit samples from the manual refresh control", async ({ page }) => {
  await page.route("http://127.0.0.1:8000/propagate/tle", async (route) => {
    const request = route.request();
    const payload = request.postDataJSON();

    expect(payload.frame).toBe("native");
    expect(payload.sampling.start_epoch).toBe("2024-06-21T13:31:24Z");

    await route.fulfill({
      contentType: "application/json",
      json: {
        source: {
          type: "tle",
          name: "ISS (ZARYA)",
          propagator: "orekit-tle",
        },
        frame: {
          name: "TEME",
          authority: "orekit",
          is_native: true,
        },
        units: {
          position: "km",
          velocity: "km/s",
        },
        sampling: {
          start_epoch: "2024-06-21T13:31:24Z",
          duration_minutes: 92.5,
          step_seconds: 30,
          sample_count: 2,
        },
        samples: [
          {
            epoch: "2024-06-21T13:31:24Z",
            position_km: [1, 2, 3],
            velocity_km_s: [4, 5, 6],
          },
          {
            epoch: "2024-06-21T13:31:54Z",
            position_km: [2, 3, 4],
            velocity_km_s: [5, 6, 7],
          },
        ],
      },
    });
  });

  await page.goto("/");

  await expect(page.getByTestId("frame-select")).toHaveValue("native");
  await expect(page.getByTestId("selected-frame-label")).toHaveText("Native");
  await expect(page.getByTestId("orekit-status")).toHaveText("Orekit idle");
  await expect(page.getByTestId("orekit-legend")).toHaveText("Local / Orekit");
  await page.getByTestId("refresh-orekit").click();
  await expect(page.getByTestId("orekit-status")).toHaveText(
    "Orekit TEME: 2 samples",
  );
  await expect(page.getByTestId("divergence-readout")).toContainText("Max");
  await expect(page.getByTestId("divergence-readout")).toContainText("Aligned");
  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);
});

test("sends selected propagation frame and clears stale Orekit state", async ({
  page,
}) => {
  const requestedFrames: string[] = [];

  await page.route("http://127.0.0.1:8000/propagate/tle", async (route) => {
    const request = route.request();
    const payload = request.postDataJSON();
    requestedFrames.push(payload.frame);

    await route.fulfill({
      contentType: "application/json",
      json: {
        source: {
          type: "tle",
          name: "ISS (ZARYA)",
          propagator: "orekit-tle",
        },
        frame: {
          name: payload.frame === "native" ? "TEME" : payload.frame,
          authority: "orekit",
          is_native: payload.frame === "native",
          requested: payload.frame,
          source: "TEME",
          origin: payload.frame === "QSW" ? "spacecraft" : "geocentric",
        },
        units: {
          position: "km",
          velocity: "km/s",
        },
        sampling: {
          start_epoch: "2024-06-21T13:31:24Z",
          duration_minutes: 92.5,
          step_seconds: 30,
          sample_count: 2,
        },
        samples: [
          {
            epoch: "2024-06-21T13:31:24Z",
            position_km: [1, 2, 3],
            velocity_km_s: [4, 5, 6],
          },
          {
            epoch: "2024-06-21T13:31:54Z",
            position_km: [2, 3, 4],
            velocity_km_s: [5, 6, 7],
          },
        ],
      },
    });
  });

  await page.goto("/");

  await page.getByTestId("refresh-orekit").click();
  await expect(page.getByTestId("orekit-status")).toHaveText(
    "Orekit TEME: 2 samples",
  );
  await expect(page.getByTestId("divergence-readout")).toContainText("Max");

  await page.getByTestId("frame-select").selectOption("EME2000");
  await expect(page.getByTestId("selected-frame-label")).toHaveText(
    "ECI (EME2000)",
  );
  await expect(page.getByTestId("orekit-status")).toHaveText(
    "Refresh ECI (EME2000)",
  );
  await expect(page.getByTestId("divergence-readout")).toContainText("Frame--");

  await page.getByTestId("refresh-orekit").click();
  await expect(page.getByTestId("orekit-status")).toHaveText(
    "Orekit EME2000: 2 samples",
  );
  await expect(page.getByTestId("orekit-legend")).toHaveText("Orekit display");
  await expect(page.getByTestId("divergence-readout")).toContainText(
    "FrameEME2000",
  );

  expect(requestedFrames).toEqual(["native", "EME2000"]);
  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);
});

test("loads scenario examples and uses the selected TLE for refresh", async ({
  page,
}) => {
  await routeScenarioExamples(page);

  await page.route("http://127.0.0.1:8000/scenarios/examples/iss-tle", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: issTleScenarioResponse(),
    });
  });

  await page.route("http://127.0.0.1:8000/propagate/tle", async (route) => {
    const request = route.request();
    const payload = request.postDataJSON();

    expect(payload.tle.name).toBe("ISS (ZARYA)");
    expect(payload.tle.line1).toContain("25544U");

    await route.fulfill({
      contentType: "application/json",
      json: {
        source: {
          type: "tle",
          name: "ISS (ZARYA)",
          propagator: "orekit-tle",
        },
        frame: {
          name: "TEME",
          authority: "orekit",
          is_native: true,
        },
        units: {
          position: "km",
          velocity: "km/s",
        },
        sampling: {
          start_epoch: "2024-06-21T13:31:24Z",
          duration_minutes: 92.5,
          step_seconds: 30,
          sample_count: 2,
        },
        samples: [
          {
            epoch: "2024-06-21T13:31:24Z",
            position_km: [1, 2, 3],
            velocity_km_s: [4, 5, 6],
          },
          {
            epoch: "2024-06-21T13:31:54Z",
            position_km: [2, 3, 4],
            velocity_km_s: [5, 6, 7],
          },
        ],
      },
    });
  });

  await page.goto("/");

  await expect(page.getByTestId("scenario-select")).toHaveValue("iss-tle");
  await expect(page.getByTestId("scenario-status")).toHaveText(
    "ISS (ZARYA) loaded",
  );
  await expect(page.getByTestId("scenario-metadata")).toContainText("tle");
  await expect(page.getByTestId("scenario-metadata")).toContainText("TEME");

  await page.getByTestId("refresh-orekit").click();
  await expect(page.getByTestId("orekit-status")).toHaveText(
    "Orekit TEME: 2 samples",
  );
  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);
});

test("shows scenario load errors without blanking the scene", async ({ page }) => {
  await routeScenarioExamples(page);

  await page.route("http://127.0.0.1:8000/scenarios/examples/iss-tle", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: issTleScenarioResponse(),
    });
  });

  await page.route("http://127.0.0.1:8000/scenarios/examples/iss-oem", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      json: {
        error: {
          code: "orekit_unavailable",
          message: "OREKIT_DATA_PATH is required for OEM parsing.",
        },
      },
    });
  });

  await page.goto("/");
  await expect(page.getByTestId("scenario-status")).toHaveText(
    "ISS (ZARYA) loaded",
  );

  await page.getByTestId("scenario-select").selectOption("iss-oem");
  await page.getByTestId("load-scenario").click();

  await expect(page.getByTestId("scenario-status")).toHaveText(
    "OREKIT_DATA_PATH is required for OEM parsing.",
  );
  expect(await countNonBlankCanvasPixels(page)).toBeGreaterThan(0);
});

async function countNonBlankCanvasPixels(page: Page): Promise<number> {
  const nonBlankPixels = await page.waitForFunction(() => {
    const scene = document.querySelector<HTMLCanvasElement>("#scene");
    const context = scene?.getContext("webgl2") ?? scene?.getContext("webgl");

    if (!scene || !context || scene.width === 0 || scene.height === 0) {
      return 0;
    }

    context.finish();

    const sampleWidth = Math.min(scene.width, 64);
    const sampleHeight = Math.min(scene.height, 64);
    const pixels = new Uint8Array(sampleWidth * sampleHeight * 4);
    context.readPixels(
      Math.floor((scene.width - sampleWidth) / 2),
      Math.floor((scene.height - sampleHeight) / 2),
      sampleWidth,
      sampleHeight,
      context.RGBA,
      context.UNSIGNED_BYTE,
      pixels,
    );

    let nonBackgroundPixels = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];

      if (alpha > 0 && (red !== 7 || green !== 16 || blue !== 20)) {
        nonBackgroundPixels += 1;
      }
    }

    return nonBackgroundPixels;
  });

  return nonBlankPixels.jsonValue();
}

async function routeScenarioExamples(page: Page): Promise<void> {
  await page.route("http://127.0.0.1:8000/scenarios/examples", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: [
        {
          id: "iss-tle",
          name: "ISS (ZARYA)",
          source_type: "tle",
          format: "tle",
          frame: "TEME",
        },
        {
          id: "iss-oem",
          name: "ISS OEM sample",
          source_type: "oem_ccsds",
          format: "ccsds-oem",
          frame: "EME2000",
        },
      ],
    });
  });
}

function issTleScenarioResponse() {
  return {
    id: "iss-tle",
    name: "ISS (ZARYA)",
    source: {
      type: "tle",
      format: "tle",
      object_id: "25544",
      raw: "ISS (ZARYA)\n1 25544U 98067A   24173.56347222  .00020137  00000+0  35155-3 0  9993\n2 25544  51.6390 336.0970 0007833  50.2065  79.8843 15.50417852458913",
    },
    frame: {
      name: "TEME",
      origin: "geocentric",
    },
    units: {
      position: "km",
      velocity: "km/s",
    },
    tle: {
      line1:
        "1 25544U 98067A   24173.56347222  .00020137  00000+0  35155-3 0  9993",
      line2:
        "2 25544  51.6390 336.0970 0007833  50.2065  79.8843 15.50417852458913",
    },
    samples: [],
  };
}
