import { redirect } from "next/navigation";

export default function SettingsDesignationsRedirect() {
  redirect("/organization?tab=designations");
}
