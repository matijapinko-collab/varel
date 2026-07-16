import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categoryRequiresApproval,
  nextVersionLabel,
  validateUpload,
  ELECTRO_ALLOWED_DOC_MIME,
  ELECTRO_ALLOWED_PHOTO_MIME,
} from "../../src/lib/electro/documents.ts";

test("categoryRequiresApproval: technical categories need engineer approval (brief §24)", () => {
  assert.equal(categoryRequiresApproval("TECHNICAL_DRAWING"), true);
  assert.equal(categoryRequiresApproval("SCHEME"), true);
  assert.equal(categoryRequiresApproval("CERTIFICATE"), true);
  assert.equal(categoryRequiresApproval("CONTRACT"), false);
  assert.equal(categoryRequiresApproval("INVOICE"), false);
});

test("nextVersionLabel: approved bumps major, otherwise minor (brief §25)", () => {
  assert.equal(nextVersionLabel(null, false), "1.0");
  assert.equal(nextVersionLabel("1.0", false), "1.1");
  assert.equal(nextVersionLabel("1.2", false), "1.3");
  // A new upload replacing an approved version bumps the major.
  assert.equal(nextVersionLabel("2.0", true), "3.0");
  assert.equal(nextVersionLabel("1.3", true), "2.0");
});

test("validateUpload: enforces MIME allowlist and size (brief §64–§65)", () => {
  assert.equal(validateUpload("application/pdf", 1000, ELECTRO_ALLOWED_DOC_MIME), null);
  assert.ok(validateUpload("application/x-msdownload", 1000, ELECTRO_ALLOWED_DOC_MIME));
  assert.ok(validateUpload("application/pdf", 0, ELECTRO_ALLOWED_DOC_MIME));
  assert.ok(validateUpload("application/pdf", 60 * 1024 * 1024, ELECTRO_ALLOWED_DOC_MIME));
  assert.equal(validateUpload("image/jpeg", 5000, ELECTRO_ALLOWED_PHOTO_MIME), null);
  assert.ok(validateUpload("application/pdf", 5000, ELECTRO_ALLOWED_PHOTO_MIME));
});
