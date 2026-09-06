test("generateStaticParams covers 5 locales", async () => {
  const { generateStaticParams } = await import("@/app/[lang]/layout");
  expect(await generateStaticParams()).toEqual([{ lang: "en" }, { lang: "es" }, { lang: "fr" }, { lang: "de" }, { lang: "pt" }]);
});
