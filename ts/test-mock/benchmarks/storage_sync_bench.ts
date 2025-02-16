// Copyright 2022 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only
/* eslint-disable no-await-in-loop, no-console */

import type { PrimaryDevice } from '@signalapp/mock-server';
import { StorageState } from '@signalapp/mock-server';

import type { App } from './fixtures';
import { Bootstrap } from './fixtures';

const CONTACT_COUNT = 1000;

void (async () => {
  const contactNames = new Array<string>();
  for (let i = 0; i < CONTACT_COUNT; i += 1) {
    contactNames.push(`Contact ${i}`);
  }

  const bootstrap = new Bootstrap({
    benchmark: true,
  });

  await bootstrap.init();
  const { phone, server } = bootstrap;

  let state = StorageState.getEmpty();
  let lastContact: PrimaryDevice | undefined;
  for (const [i, profileName] of contactNames.entries()) {
    const contact = await server.createPrimaryDevice({
      profileName,
    });

    state = state.addContact(contact, {
      // Make sure we fetch profile from the server
      givenName: `Loading ${profileName}...`,

      identityKey: contact.publicKey.serialize(),
      profileKey: contact.profileKey.serialize(),
    });

    if (i >= contactNames.length - 4) {
      state = state.pin(contact);
    }

    if (i === contactNames.length - 1) {
      lastContact = contact;
    }
  }

  await phone.setStorageState(state);

  const start = Date.now();
  let app: App | undefined;
  try {
    app = await bootstrap.link();
    const window = await app.getWindow();

    const leftPane = window.locator('.left-pane-wrapper');

    const item = leftPane.locator(
      `[data-testid="${lastContact?.toContact().uuid}"]`
    );
    await item.waitFor();

    const duration = Date.now() - start;
    console.log(`Took: ${(duration / 1000).toFixed(2)} seconds`);
  } catch (error) {
    await bootstrap.saveLogs(app);
    throw error;
  } finally {
    await app?.close();
    await bootstrap.teardown();
  }
})();
