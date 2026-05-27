import { redirect } from "next/navigation";

export default function CompanySettingsRedirectPage() {
  redirect("/settings/workspace");
}
