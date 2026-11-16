import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreateAppointmentHref,
  canShowAppointmentCancel,
  canShowAppointmentReschedule,
  canShowCreateNewAfterNoShow,
} from "./appointment-detail-actions.utils";

describe("appointment detail actions", () => {
  const baseRescheduleOpts = {
    canCreate: true,
    auditPending: false,
    atRescheduleLimit: false,
  };

  it("shows reschedule only for scheduled and confirmed", () => {
    assert.equal(
      canShowAppointmentReschedule("scheduled", baseRescheduleOpts),
      true,
    );
    assert.equal(
      canShowAppointmentReschedule("confirmed", baseRescheduleOpts),
      true,
    );
    assert.equal(
      canShowAppointmentReschedule("no_show", baseRescheduleOpts),
      false,
    );
    assert.equal(
      canShowAppointmentReschedule("completed", baseRescheduleOpts),
      false,
    );
  });

  it("hides reschedule at limit or while audit is loading", () => {
    assert.equal(
      canShowAppointmentReschedule("scheduled", {
        ...baseRescheduleOpts,
        atRescheduleLimit: true,
      }),
      false,
    );
    assert.equal(
      canShowAppointmentReschedule("scheduled", {
        ...baseRescheduleOpts,
        auditPending: true,
      }),
      false,
    );
  });

  it("shows create new after no_show for authorized staff", () => {
    assert.equal(canShowCreateNewAfterNoShow("no_show", true), true);
    assert.equal(canShowCreateNewAfterNoShow("no_show", false), false);
    assert.equal(canShowCreateNewAfterNoShow("scheduled", true), false);
  });

  it("shows cancel only for scheduled and confirmed", () => {
    assert.equal(canShowAppointmentCancel("scheduled", true), true);
    assert.equal(canShowAppointmentCancel("confirmed", true), true);
    assert.equal(canShowAppointmentCancel("no_show", true), false);
  });

  it("builds create appointment href with patient and org", () => {
    const href = buildCreateAppointmentHref({
      organizationId: "org1",
      patientId: "pat1",
      doctorId: "doc1",
    });
    assert.equal(
      href,
      "/appointments/create?organizationId=org1&patientId=pat1&doctorId=doc1",
    );
  });
});