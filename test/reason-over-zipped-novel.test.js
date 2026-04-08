import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import zippedNovelTask, {
  gradeMysteriesOfLondonAnswer,
} from "../src/tasks/02-reason-over-zipped-novel.js";

test("gradeMysteriesOfLondonAnswer fails when task-2-answer.json is missing", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));

  const result = await gradeMysteriesOfLondonAnswer(workspaceDir);

  assert.equal(result.pass, false);
  assert.match(result.message, /task-2-answer\.json/i);
});

test("task 2 setup copies the zip archive into task-2", () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));

  zippedNovelTask.setup(workspaceDir);

  assert.equal(existsSync(join(workspaceDir, "task-2", "README.md")), true);
  assert.equal(
    existsSync(join(workspaceDir, "task-2", "task-2-mysteries-of-london.zip")),
    true,
  );
});

test("gradeMysteriesOfLondonAnswer accepts a complete answer with citations", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));

  writeFileSync(
    join(workspaceDir, "task-2-answer.json"),
    JSON.stringify(buildCandidateAnswer(), null, 2),
  );

  const result = await gradeMysteriesOfLondonAnswer(workspaceDir);

  assert.equal(result.pass, true);
});

test("gradeMysteriesOfLondonAnswer accepts required chapter citations without semantic detail matching", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));
  const answer = buildCandidateAnswer();
  answer.evidence = answer.evidence.map((item) => ({
    chapterId: item.chapterId,
    detail: "Relevant chapter citation.",
  }));

  writeFileSync(
    join(workspaceDir, "task-2-answer.json"),
    JSON.stringify(answer, null, 2),
  );

  const result = await gradeMysteriesOfLondonAnswer(workspaceDir);

  assert.equal(result.pass, true);
});

test("gradeMysteriesOfLondonAnswer still rejects an incorrect title explanation", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));
  const answer = buildCandidateAnswer();
  answer.answer =
    "Thomas Rainford is only a distant relation, while Charles Hatfield permanently inherits the Ellingham title because the family documents confirm him as the rightful and legitimate heir to the earldom after Arthur falls away from the line of succession.";

  writeFileSync(
    join(workspaceDir, "task-2-answer.json"),
    JSON.stringify(answer, null, 2),
  );

  const result = await gradeMysteriesOfLondonAnswer(workspaceDir);

  assert.equal(result.pass, false);
  assert.match(result.message, /required ideas/i);
});

function buildCandidateAnswer() {
  return {
    answer:
      "Thomas Rainford, later living as Mr. Hatfield, is the legitimate elder son of the late Earl of Ellingham and therefore the rightful Earl in place of Arthur. That discovery makes Charles Hatfield appear to be the next man in line, because he is presented as Rainford's son and therefore as Viscount Marston, heir to the earldom. But the later family documents cut that claim away: Charles was not born in wedlock, so the secret that first seems to elevate him ends by leaving him plain Charles Hatfield rather than a secure heir to the title.",
    evidence: [
      {
        chapterId: "v3-ch084",
        detail:
          "Old Death explicitly says Thomas Rainford was the elder brother of the Earl of Ellingham and was legitimately born.",
      },
      {
        chapterId: "v4-ch017",
        detail:
          "Charles reads the marriage certificate of Octavia Manners and the baptism record showing Rainford was born legitimate and was the rightful Earl.",
      },
      {
        chapterId: "v4-ch029",
        detail:
          "The papers are used to frame Charles as Viscount Marston and heir because Rainford is treated as the real Earl of Ellingham.",
      },
      {
        chapterId: "v4-ch043",
        detail:
          "Mr. Hatfield later shows the marriage certificate proving Charles could not have been born in wedlock, destroying the Viscount Marston claim.",
      },
    ],
  };
}
