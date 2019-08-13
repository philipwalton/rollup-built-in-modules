/*
 Copyright 2019 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import storage from 'std:kv-storage';


let preferences = {};
const preferencesForm = document.getElementById('preferences-form');
const lastSavedTimestamp = document.getElementById('last-saved-timestamp');
const polyfillStatus = document.getElementById('polyfill-status');

/**
 * Returns an object indicating the checked status of each checkbox in the
 * preferences form. The object keys are the input names.
 * @return {Object<string, boolean>}
 */
const getFormPreferences = () => {
  const formData = {};
  for (const input of Array.from(preferencesForm.querySelectorAll('input'))) {
    formData[input.name] = input.checked;
  }
  return formData;
};

/**
 * Sets the checked property of each checkbox in the preferences form based
 * on the given preferences object, where each key is an input name.
 * @param {Object<string, boolean>} preferences
 */
const setFormPreferences = (preferences) => {
  for (const input of Array.from(preferencesForm.querySelectorAll('input'))) {
    input.checked = preferences[input.name];
  }
};

/**
 * Updates the text of the `last-saved-timestamp` element in the DOM based on
 * the passed timestamp.
 * @param {Date} timestamp.
 */
const setLastSavedTimestamp = (timestamp) => {
  lastSavedTimestamp.textContent =
      timestamp ? timestamp.toLocaleString() : '(unsaved)';
};

/**
 * Updates the text of the `polyfill-status` element in the DOM based on
 * whether or not the polyfilled version of `storage` is detected.
 */
const setPolyfillStatus = () => {
  polyfillStatus.textContent = 'backingStore' in storage.constructor.prototype ?
      'built-in module' : 'polyfill';
}

/**
 * Handles storing the user preferences and updating the saved timestamp in
 * response to the form submit event. The default submit action is also
 * prevented because we're not submiting the form to a server.
 * @param {Event} event.
 */
const onSave = async (event) => {
  // Don't submit the form since we're saving the data locally.
  event.preventDefault();

  // Update the preferences object.
  Object.assign(preferences, {timestamp: new Date()}, getFormPreferences());

  try {
    // Save the preferences in KV Storage.
    await storage.set('preferences', preferences);

    // Inform the user of a successful save.
    setLastSavedTimestamp(preferences.timestamp);
  } catch (error) {
    alert('Error saving preferences');
    console.error(error);
  }
}

/**
 * The main entry point of the module. The functino gets the stored
 * preferences and updates the DOM accordingly. It also adds an event listener
 * for the form submit.
 */
const main = async () => {
  // Use a try/catch block since it's possible that the read will fail.
  // In some browsers it will always fail in private browsing mode.
  try {
    preferences = await storage.get('preferences') || {};
  } catch (error) {
    alert('Error reading stored preferences. Note: ' +
        'some browsers do not allow storage access in private browsing mode');
    console.error(error);
  }

  setFormPreferences(preferences);
  setLastSavedTimestamp(preferences.timestamp, {animate: false});
  setPolyfillStatus();

  preferencesForm.addEventListener('submit', onSave);
}

main();
