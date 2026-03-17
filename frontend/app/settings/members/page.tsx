"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useTenant } from "@/lib/hooks/use-tenant";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { listMembers, addMember, removeMember } from "@/lib/api/enterprise-api";
import type { Role } from "@/lib/api/types";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/input";
import { Label } from "@/components/shared/ui/label";
import { Badge } from "@/components/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select";

const ROLES: Role[] = [
  "tenant_admin",
  "owner",
  "finance_manager",
  "accountant_readonly",
];

const ROLE_LABELS: Record<Role, string> = {
  tenant_admin: "Tenant Admin",
  owner: "Owner",
  finance_manager: "Finance Manager",
  accountant_readonly: "Accountant (Read-only)",
  group_cfo: "Group CFO",
  treasury_director: "Treasury Director",
  financial_controller: "Financial Controller",
  ap_manager: "AP Manager",
  ar_manager: "AR Manager",
  bank_relationship_manager: "Bank Relationship Manager",
  auditor_readonly: "Auditor (Read-only)",
  board_member: "Board Member",
};

export default function MembersPage() {
  const { t } = useI18n();
  const { currentTenant } = useTenant();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<Role>("accountant_readonly");
  const [showAdd, setShowAdd] = useState(false);

  const MOCK_MEMBERS = [
    { id: "m1", user_id: "admin@demo.com", role: "tenant_admin" as const, status: "active" as const, tenant_id: "", created_at: "", updated_at: "" },
    { id: "m2", user_id: "finance@demo.com", role: "finance_manager" as const, status: "active" as const, tenant_id: "", created_at: "", updated_at: "" },
    { id: "m3", user_id: "accountant@demo.com", role: "accountant_readonly" as const, status: "active" as const, tenant_id: "", created_at: "", updated_at: "" },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["members", currentTenant?.id],
    queryFn: () => listMembers(currentTenant!.id),
    enabled: !!currentTenant,
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addMember(currentTenant!.id, { user_id: newUserId, role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setNewUserId("");
      setShowAdd(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId: string) =>
      removeMember(currentTenant!.id, membershipId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const members = data?.data ?? MOCK_MEMBERS;
  const totalMembers = members.filter((m: any) => m.status === "active").length;
  const canAdd = can("member:add");
  const canRemove = can("member:remove");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">{t.settings.membersTitle}</CardTitle>
        {canAdd && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdd(!showAdd)}
          >
            <UserPlus className="h-4 w-4 me-2" />
            {t.settings.addMember}
          </Button>
        )}
      </div>

      {showAdd && canAdd && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">{t.settings.userId}</Label>
                <Input
                  placeholder="User UUID"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.settings.role}</Label>
                <Select
                  value={newRole}
                  onValueChange={(v) => setNewRole(v as Role)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  disabled={!newUserId || addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                >
                  {t.common.add}
                </Button>
              </div>
            </div>
            {addMutation.isError && (
              <p className="text-sm text-destructive">
                {(addMutation.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t.common.noData}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-start font-medium">User ID</th>
                    <th className="px-4 py-3 text-start font-medium">{t.settings.role}</th>
                    <th className="px-4 py-3 text-start font-medium">Status</th>
                    {canRemove && (
                      <th className="px-4 py-3 text-end font-medium" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {members.slice(0, 5).map((m: any) => (
                    <tr key={m.id} className="border-b">
                      <td className="px-4 py-3 font-mono text-xs">
                        {m.user_id}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{ROLE_LABELS[m.role as Role] || m.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            m.status === "active" ? "default" : "outline"
                          }
                        >
                          {m.status}
                        </Badge>
                      </td>
                      {canRemove && (
                        <td className="px-4 py-3 text-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeMutation.mutate(m.id)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
