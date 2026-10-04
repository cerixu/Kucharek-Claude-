    const { loadAll, listRecipes } = await import('/recipes.js');
    const legacy = 'https://images.unsplash.com/photo-legacy-build';
    const cur = await db.get('recipes', 'rcp_seed_pizza');
    await db.put('recipes', { ...cur, photo: legacy, thumb: legacy });
    await db.put('settings', { key: 'seedLibraryVersion', value: 5 });
    await loadAll();
    const next = listRecipes().find(x => x.id === 'rcp_seed_pizza');
    return { photo: next?.photo || '', version: (await db.get('settings', 'seedLibraryVersion'))?.value };
  });
  expect(out.version).toBe(11);
  expect(out.photo).toMatch(/^https:\/\/photoshop-api\.adobe\.io\/v2\/short-url\//);
});

