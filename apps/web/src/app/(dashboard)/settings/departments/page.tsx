import { redirect } from "next/navigation";

export default function SettingsDepartmentsRedirect() {
  redirect("/organization?tab=departments");
}
