import en from "@/i18n/dictionaries/en.json";

it("help/setup/login/invite/system keys exist", () => {
  const d = en as any;
  for (const k of ["setup", "login", "help", "invite", "system"]) expect(d[k]).toBeDefined();
});
