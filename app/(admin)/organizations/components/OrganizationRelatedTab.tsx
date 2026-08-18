"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LinkCell } from "@/components/shared/LinkCell";
import { useUsers } from "@/hooks/users/useUsers";
import { usePatients } from "@/hooks/patients/usePatients";
import { useSessions } from "@/hooks/sessions/useSessions";
import { useRoles } from "@/hooks/roles/useRoles";
import { useDepartments } from "@/hooks/departments/useDepartments";

type RelatedKey =
  | "users"
  | "doctors"
  | "patients"
  | "consultations"
  | "roles"
  | "permissions"
  | "departments"
  | "appointments"
  | "admissions"
  | "reports";

interface RelatedSectionConfig {
  key: RelatedKey;
  title: string;
  description: string;
  addHref?: string;
  viewAllHref?: string;
  available: boolean;
}

interface OrganizationRelatedTabProps {
  organizationId: string;
}

const SECTIONS: RelatedSectionConfig[] = [
  {
    key: "users",
    title: "Users",
    description: "People belonging to this organization",
    addHref: "/users/create",
    viewAllHref: "/users",
    available: true,
  },
  {
    key: "doctors",
    title: "Doctors",
    description: "Users with a doctor designation/role",
    addHref: "/users/create",
    viewAllHref: "/users",
    available: true,
  },
  {
    key: "patients",
    title: "Patients",
    description: "Patients registered under this organization",
    addHref: "/patients/create",
    viewAllHref: "/patients",
    available: true,
  },
  {
    key: "consultations",
    title: "Consultations",
    description: "Consultation sessions for this organization",
    addHref: "/sessions/create",
    viewAllHref: "/sessions",
    available: true,
  },
  {
    key: "roles",
    title: "Roles",
    description: "Roles defined for this organization",
    addHref: "/roles/create",
    viewAllHref: "/roles",
    available: true,
  },
  {
    key: "permissions",
    title: "Permissions",
    description: "Permission matrix and role access",
    viewAllHref: "/permissions",
    available: true,
  },
  {
    key: "departments",
    title: "Departments",
    description: "Department structure for this organization",
    addHref: "/departments/create",
    viewAllHref: "/departments",
    available: true,
  },
  {
    key: "appointments",
    title: "Appointments",
    description: "Scheduled appointments",
    available: false,
  },
  {
    key: "admissions",
    title: "Admissions",
    description: "Inpatient admissions linked to consultations",
    viewAllHref: "/sessions",
    available: true,
  },
  {
    key: "reports",
    title: "Reports",
    description: "Usage and performance reports",
    viewAllHref: "/reports",
    available: true,
  },
];

function isDoctorRole(roleName?: string) {
  if (!roleName) return false;
  return /doctor|physician|consultant/i.test(roleName);
}

function getUserId(user: { id?: string; _id?: string }) {
  return String(user.id || user._id || "");
}

function getRoleName(role: unknown): string {
  if (!role) return "";
  if (typeof role === "string") return role;
  if (typeof role === "object" && role !== null && "name" in role) {
    return String((role as { name?: string }).name || "");
  }
  return "";
}

export function OrganizationRelatedTab({
  organizationId,
}: OrganizationRelatedTabProps) {
  const [expanded, setExpanded] = useState<RelatedKey | null>("users");

  return (
    <div className="space-y-3">
      {SECTIONS.map((section) => (
        <RelatedSection
          key={section.key}
          section={section}
          organizationId={organizationId}
          open={expanded === section.key}
          onToggle={() =>
            setExpanded((current) =>
              current === section.key ? null : section.key,
            )
          }
        />
      ))}
    </div>
  );
}

function RelatedSection({
  section,
  organizationId,
  open,
  onToggle,
}: {
  section: RelatedSectionConfig;
  organizationId: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="glass overflow-hidden rounded-3xl">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/5 sm:px-5"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {section.title}
            </h3>
            {!section.available ? (
              <Badge variant="secondary" className="text-[10px]">
                Coming soon
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{section.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {section.viewAllHref ? (
            <Link
              href={section.viewAllHref}
              onClick={(e) => e.stopPropagation()}
              className="hidden text-xs text-primary hover:underline sm:inline"
            >
              View all
            </Link>
          ) : null}
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {open ? (
        <div className="border-t border-border/50 px-4 py-4 sm:px-5">
          {section.available ? (
            <RelatedSectionBody
              sectionKey={section.key}
              organizationId={organizationId}
              addHref={section.addHref}
              viewAllHref={section.viewAllHref}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              {section.title} is not available in this release.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function RelatedSectionBody({
  sectionKey,
  organizationId,
  addHref,
  viewAllHref,
}: {
  sectionKey: RelatedKey;
  organizationId: string;
  addHref?: string;
  viewAllHref?: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 5;
  const deferredSearch = search.trim();

  if (sectionKey === "permissions") {
    return (
      <EmptyRelated
        message="Manage role permissions from the Permissions workspace."
        actionHref="/permissions"
        actionLabel="Open Permissions"
      />
    );
  }

  if (sectionKey === "reports") {
    return (
      <EmptyRelated
        message="View organization analytics in Reports."
        actionHref="/reports"
        actionLabel="Open Reports"
      />
    );
  }

  if (sectionKey === "users" || sectionKey === "doctors") {
    return (
      <UsersRelatedTable
        organizationId={organizationId}
        doctorsOnly={sectionKey === "doctors"}
        search={deferredSearch}
        page={page}
        limit={limit}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onPageChange={setPage}
        addHref={addHref}
        viewAllHref={viewAllHref}
      />
    );
  }

  if (sectionKey === "patients") {
    return (
      <PatientsRelatedTable
        organizationId={organizationId}
        search={deferredSearch}
        page={page}
        limit={limit}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onPageChange={setPage}
        addHref={addHref}
        viewAllHref={viewAllHref}
      />
    );
  }

  if (sectionKey === "consultations" || sectionKey === "admissions") {
    return (
      <SessionsRelatedTable
        organizationId={organizationId}
        admissionsOnly={sectionKey === "admissions"}
        search={deferredSearch}
        page={page}
        limit={limit}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onPageChange={setPage}
        addHref={addHref}
        viewAllHref={viewAllHref}
      />
    );
  }

  if (sectionKey === "roles") {
    return (
      <RolesRelatedTable
        organizationId={organizationId}
        search={deferredSearch}
        page={page}
        limit={limit}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onPageChange={setPage}
        addHref={addHref}
        viewAllHref={viewAllHref}
      />
    );
  }

  if (sectionKey === "departments") {
    return (
      <DepartmentsRelatedTable
        organizationId={organizationId}
        search={deferredSearch}
        page={page}
        limit={limit}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onPageChange={setPage}
        addHref={addHref}
        viewAllHref={viewAllHref}
      />
    );
  }

  return null;
}

function RelatedToolbar({
  search,
  onSearchChange,
  total,
  addHref,
  viewAllHref,
  addLabel = "Add",
}: {
  search: string;
  onSearchChange: (value: string) => void;
  total: number;
  addHref?: string;
  viewAllHref?: string;
  addLabel?: string;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search…"
          className="rounded-full pl-9"
        />
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="rounded-full">
          {total} total
        </Badge>
        {viewAllHref ? (
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href={viewAllHref}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View
            </Link>
          </Button>
        ) : null}
        {addHref ? (
          <Button asChild size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700">
            <Link href={addHref}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {addLabel}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function EmptyRelated({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-4 rounded-full bg-blue-600 hover:bg-blue-700" size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

function UsersRelatedTable({
  organizationId,
  doctorsOnly,
  search,
  page,
  limit,
  onSearchChange,
  onPageChange,
  addHref,
  viewAllHref,
}: {
  organizationId: string;
  doctorsOnly: boolean;
  search: string;
  page: number;
  limit: number;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  addHref?: string;
  viewAllHref?: string;
}) {
  const { users, total, totalPages, isLoading } = useUsers({
    organizationId,
    search,
    page: doctorsOnly ? 1 : page,
    limit: doctorsOnly ? 100 : limit,
  });

  const filtered = useMemo(() => {
    if (!doctorsOnly) return users;
    return users.filter((user) => isDoctorRole(getRoleName(user.roleId)));
  }, [doctorsOnly, users]);

  const paged = doctorsOnly
    ? filtered.slice((page - 1) * limit, page * limit)
    : filtered;
  const effectiveTotal = doctorsOnly ? filtered.length : total;
  const effectivePages = doctorsOnly
    ? Math.max(1, Math.ceil(filtered.length / limit))
    : totalPages;

  return (
    <div>
      <RelatedToolbar
        search={search}
        onSearchChange={onSearchChange}
        total={effectiveTotal}
        addHref={addHref}
        viewAllHref={viewAllHref}
        addLabel={doctorsOnly ? "Add Doctor" : "Add User"}
      />
      {isLoading ? (
        <LoadingBlock />
      ) : paged.length === 0 ? (
        <EmptyRelated message={`No ${doctorsOnly ? "doctors" : "users"} found.`} />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((user) => {
                  const id = getUserId(user);
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <LinkCell href={`/users/${id}`}>
                          {user.firstName} {user.lastName}
                        </LinkCell>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>{getRoleName(user.roleId) || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive === false ? "secondary" : "default"}
                        >
                          {user.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            page={page}
            totalPages={effectivePages}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}

function PatientsRelatedTable({
  organizationId,
  search,
  page,
  limit,
  onSearchChange,
  onPageChange,
  addHref,
  viewAllHref,
}: {
  organizationId: string;
  search: string;
  page: number;
  limit: number;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  addHref?: string;
  viewAllHref?: string;
}) {
  const { patients, total, totalPages, isLoading } = usePatients({
    organizationId,
    search,
    page,
    limit,
  });

  return (
    <div>
      <RelatedToolbar
        search={search}
        onSearchChange={onSearchChange}
        total={total}
        addHref={addHref}
        viewAllHref={viewAllHref}
        addLabel="Add Patient"
      />
      {isLoading ? (
        <LoadingBlock />
      ) : patients.length === 0 ? (
        <EmptyRelated message="No patients found." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => {
                  const id = String(patient.id || patient._id || "");
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <LinkCell href={`/patients/${id}`}>
                          {patient.firstName} {patient.lastName}
                        </LinkCell>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {patient.patientCode || "—"}
                      </TableCell>
                      <TableCell>{patient.phoneNumber || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            patient.isActive === false ? "secondary" : "default"
                          }
                        >
                          {patient.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}

function SessionsRelatedTable({
  organizationId,
  admissionsOnly,
  search,
  page,
  limit,
  onSearchChange,
  onPageChange,
  addHref,
  viewAllHref,
}: {
  organizationId: string;
  admissionsOnly: boolean;
  search: string;
  page: number;
  limit: number;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  addHref?: string;
  viewAllHref?: string;
}) {
  const { sessions, total, totalPages, isLoading } = useSessions({
    organizationId,
    search,
    page: admissionsOnly ? 1 : page,
    limit: admissionsOnly ? 50 : limit,
  });

  const filtered = useMemo(() => {
    if (!admissionsOnly) return sessions;
    return sessions.filter(
      (session) =>
        session.visitType === "inpatient" ||
        session.encounter?.encounterType === "IP" ||
        Boolean(session.encounter?.admission),
    );
  }, [admissionsOnly, sessions]);

  const paged = admissionsOnly
    ? filtered.slice((page - 1) * limit, page * limit)
    : filtered;
  const effectiveTotal = admissionsOnly ? filtered.length : total;
  const effectivePages = admissionsOnly
    ? Math.max(1, Math.ceil(filtered.length / limit))
    : totalPages;

  return (
    <div>
      <RelatedToolbar
        search={search}
        onSearchChange={onSearchChange}
        total={effectiveTotal}
        addHref={admissionsOnly ? undefined : addHref}
        viewAllHref={viewAllHref}
        addLabel="Add Consultation"
      />
      {isLoading ? (
        <LoadingBlock />
      ) : paged.length === 0 ? (
        <EmptyRelated
          message={
            admissionsOnly ? "No admissions found." : "No consultations found."
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((session) => {
                  const id = String(session.id || session._id || "");
                  const type =
                    session.encounter?.encounterType ||
                    session.visitType ||
                    session.sessionType ||
                    "—";
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <LinkCell href={`/sessions/${id}`}>
                          {session.sessionCode || id.slice(0, 8)}
                        </LinkCell>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {String(session.status || "—").replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="uppercase">{type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {session.createdAt
                          ? new Date(session.createdAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            page={page}
            totalPages={effectivePages}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}

function RolesRelatedTable({
  organizationId,
  search,
  page,
  limit,
  onSearchChange,
  onPageChange,
  addHref,
  viewAllHref,
}: {
  organizationId: string;
  search: string;
  page: number;
  limit: number;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  addHref?: string;
  viewAllHref?: string;
}) {
  const { roles, total, totalPages, isLoading } = useRoles({
    organizationId,
    search,
    page,
    limit,
  });

  return (
    <div>
      <RelatedToolbar
        search={search}
        onSearchChange={onSearchChange}
        total={total}
        addHref={addHref}
        viewAllHref={viewAllHref}
        addLabel="Add Role"
      />
      {isLoading ? (
        <LoadingBlock />
      ) : roles.length === 0 ? (
        <EmptyRelated message="No roles found." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => {
                  const id = String(role.id || role._id || "");
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <LinkCell href={`/roles/${id}`}>{role.name}</LinkCell>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            role.isActive === false ? "secondary" : "default"
                          }
                        >
                          {role.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}

function DepartmentsRelatedTable({
  organizationId,
  search,
  page,
  limit,
  onSearchChange,
  onPageChange,
  addHref,
  viewAllHref,
}: {
  organizationId: string;
  search: string;
  page: number;
  limit: number;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  addHref?: string;
  viewAllHref?: string;
}) {
  const { departments, total, totalPages, isLoading } = useDepartments({
    organizationId,
    search,
    page,
    limit,
  });

  return (
    <div>
      <RelatedToolbar
        search={search}
        onSearchChange={onSearchChange}
        total={total}
        addHref={addHref}
        viewAllHref={viewAllHref}
        addLabel="Add Department"
      />
      {isLoading ? (
        <LoadingBlock />
      ) : departments.length === 0 ? (
        <EmptyRelated message="No departments found." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => {
                  const id = String(department.id || department._id || "");
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <LinkCell href={`/departments/${id}`}>
                          {department.name}
                        </LinkCell>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {department.description || "—"}
                      </TableCell>
                      <TableCell>{department.userCount ?? 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            department.isActive === false
                              ? "secondary"
                              : "default"
                          }
                        >
                          {department.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
}
