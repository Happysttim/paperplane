import type { Mail } from '@/api/models';
import { Field } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

/** 사용자가 입력한 샘플의 메일 속성을 일반 입력 폼으로 편집합니다. */
export function SampleMail({
  value,
  onChange,
}: {
  value: Mail;
  onChange: (value: Mail) => void;
}) {
  return (
    <div className="mt-5">
      <Field id="sample-subject" label="제목">
        <Input
          id="sample-subject"
          value={value.subject}
          onChange={(event) =>
            onChange({ ...value, subject: event.target.value })
          }
        />
      </Field>
      <Field id="sample-from" label="보낸 사람 주소">
        <Input
          id="sample-from"
          type="email"
          value={value.from.address}
          onChange={(event) =>
            onChange({
              ...value,
              from: { ...value.from, address: event.target.value },
              envelope: { ...value.envelope, from: event.target.value },
            })
          }
        />
      </Field>
      <Field id="sample-name" label="보낸 사람 이름">
        <Input
          id="sample-name"
          value={value.from.name}
          onChange={(event) =>
            onChange({
              ...value,
              from: { ...value.from, name: event.target.value },
            })
          }
        />
      </Field>
      <Field id="sample-content" label="본문">
        <Textarea
          id="sample-content"
          rows={3}
          value={value.content}
          onChange={(event) =>
            onChange({
              ...value,
              content: event.target.value,
              contentSize: new TextEncoder().encode(event.target.value).length,
            })
          }
        />
      </Field>
      <label className="check-label">
        <input
          type="checkbox"
          checked={value.headers.some(
            (header) => header.key === 'List-Unsubscribe',
          )}
          onChange={(event) =>
            onChange({
              ...value,
              headers: event.target.checked
                ? [
                    {
                      key: 'List-Unsubscribe',
                      value: '<mailto:unsubscribe@example.com>',
                    },
                  ]
                : [],
            })
          }
        />
        뉴스레터로 테스트
      </label>
      <details className="mt-4">
        <summary className="text-sm">날짜·첨부파일 설정</summary>
        <Field
          id="sample-date"
          label="메일 날짜"
          hint="브라우저의 현지 시각을 기준으로 테스트합니다."
        >
          <Input
            id="sample-date"
            type="datetime-local"
            defaultValue={localTime(value.date)}
            onChange={(event) => {
              const date = new Date(event.target.value);
              onChange({
                ...value,
                date: Number.isNaN(date.getTime()) ? '' : date.toISOString(),
              });
            }}
          />
        </Field>
        {value.attachments.map((item, index) => (
          <div className="condition-row mb-3" key={index}>
            <Input
              aria-label={`샘플 첨부파일 ${index + 1}`}
              placeholder="report.pdf"
              value={item.filename}
              onChange={(event) =>
                onChange({
                  ...value,
                  attachments: value.attachments.map((entry, i) =>
                    i === index
                      ? { ...entry, filename: event.target.value }
                      : entry,
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onChange({
                  ...value,
                  attachments: value.attachments.filter((_, i) => i !== index),
                })
              }
            >
              삭제
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange({
              ...value,
              attachments: [
                ...value.attachments,
                {
                  filename: 'report.pdf',
                  contentType: 'application/pdf',
                  size: 1024,
                },
              ],
            })
          }
        >
          샘플 첨부파일 추가
        </Button>
      </details>
    </div>
  );
}

/** 무효한 날짜는 빈 입력으로 남기고 UTC를 현지 입력값으로 변환합니다. */
function localTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}
