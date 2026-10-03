import { AdminTeachers } from "@/components/admin-teachers";
import { RoleGate } from "@/components/role-gate";

export default function GuruPage() {
  return (
    <RoleGate allow={["ADMIN"]}>
      <AdminTeachers />
    </RoleGate>
  );
}
