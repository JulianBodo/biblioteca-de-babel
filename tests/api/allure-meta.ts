import * as allure from "allure-js-commons";
import { test } from "./fixtures.js";

const EPIC = "Biblioteca de Babel — API";

/** Agrupa tests bajo un feature en el reporte Allure. */
export function allureFeature(feature: string) {
  test.beforeEach(async () => {
    await allure.epic(EPIC);
    await allure.feature(feature);
    await allure.label("layer", "api");
  });
}

export function allureStory(story: string) {
  test.beforeEach(async () => {
    await allure.story(story);
  });
}

export { allure };
