import {
  type Rule,
  type RuleGroup,
  type Term,
  type TextRule,
} from '@/api/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { textFields, newGroup, localDate, dateBoundary } from './model';
/** 조건 결합 방식을 안전한 유니온 값으로 선택합니다. */
function Operator({
  value,
  onChange,
  label,
}: {
  value: 'and' | 'or';
  onChange: (value: 'and' | 'or') => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value === 'or' ? 'or' : 'and')}
    >
      <option value="and">모두 일치 (AND)</option>
      <option value="or">하나 이상 일치 (OR)</option>
    </select>
  );
}
/** 문자열 검색어와 포함·시작·끝 비교 방법을 편집합니다. */
function TermEditor({
  value,
  onChange,
  label,
}: {
  value: Term;
  onChange: (value: Term) => void;
  label: string;
}) {
  return (
    <div className="term-editor">
      <select
        aria-label={`${label} 비교 방식`}
        value={value.type}
        onChange={(event) =>
          onChange({
            ...value,
            type:
              event.target.value === 'prefix'
                ? 'prefix'
                : event.target.value === 'suffix'
                  ? 'suffix'
                  : 'middle',
          })
        }
      >
        <option value="middle">포함</option>
        <option value="prefix">시작</option>
        <option value="suffix">끝</option>
      </select>
      <Input
        aria-label={`${label} 검색어`}
        value={value.value}
        onChange={(event) => onChange({ ...value, value: event.target.value })}
        placeholder="검색어 입력"
      />
    </div>
  );
}
/** 텍스트 필드 하나의 여러 검색어와 결합 방식을 편집합니다. */
function TextCondition({
  value,
  onChange,
  label,
}: {
  value: TextRule;
  onChange: (value: TextRule) => void;
  label: string;
}) {
  return (
    <div className="condition-body">
      <Operator
        label={`${label} 검색어 결합`}
        value={value.type}
        onChange={(type) => onChange({ ...value, type })}
      />
      {value.regexp.map((term, index) => (
        <div className="condition-row" key={index}>
          <TermEditor
            label={`${label} ${index + 1}`}
            value={term}
            onChange={(next) =>
              onChange({
                ...value,
                regexp: value.regexp.map((item, i) =>
                  i === index ? next : item,
                ),
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            aria-label={`${label} 검색어 ${index + 1} 삭제`}
            onClick={() =>
              onChange({
                ...value,
                regexp: value.regexp.filter((_, i) => i !== index),
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
            regexp: [...value.regexp, { type: 'middle', value: '' }],
          })
        }
      >
        검색어 추가
      </Button>
    </div>
  );
}
/** API의 중첩 규칙 구조를 손실 없이 수정합니다. */
export function Conditions({
  rule,
  onChange,
}: {
  rule: Rule;
  onChange: (rule: Rule) => void;
}) {
  /** 해당 그룹만 교체하여 나머지 그룹의 입력을 유지합니다. */
  function update(index: number, group: RuleGroup) {
    onChange(rule.map((item, i) => (i === index ? group : item)));
  }
  return (
    <div className="condition-groups">
      {rule.map((group, index) => (
        <section className="condition-group" key={index}>
          <div className="section-heading">
            <h3>조건 그룹 {index + 1}</h3>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onChange(rule.filter((_, i) => i !== index))}
            >
              그룹 삭제
            </Button>
          </div>
          <Operator
            label={`그룹 ${index + 1} 조건 결합`}
            value={group.type}
            onChange={(type) => update(index, { ...group, type })}
          />
          <div className="field">
            <label htmlFor={`newsletter-${index}`}>뉴스레터</label>
            <select
              id={`newsletter-${index}`}
              value={String(group.postRule.newsletter)}
              onChange={(event) =>
                update(index, {
                  ...group,
                  postRule: {
                    ...group.postRule,
                    newsletter:
                      event.target.value === 'all'
                        ? 'all'
                        : event.target.value === 'true',
                  },
                })
              }
            >
              <option value="all">구분하지 않음</option>
              <option value="true">뉴스레터만</option>
              <option value="false">뉴스레터 제외</option>
            </select>
          </div>
          {textFields.map(({ key, label }) => {
            const value = group.postRule[key];
            return (
              <div className="condition" key={key}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(event) =>
                      update(index, {
                        ...group,
                        postRule: {
                          ...group.postRule,
                          [key]: event.target.checked
                            ? {
                                type: 'and',
                                regexp: [{ type: 'middle', value: '' }],
                              }
                            : undefined,
                        },
                      })
                    }
                  />
                  {label}
                </label>
                {value && (
                  <TextCondition
                    label={label}
                    value={value}
                    onChange={(next) =>
                      update(index, {
                        ...group,
                        postRule: { ...group.postRule, [key]: next },
                      })
                    }
                  />
                )}
              </div>
            );
          })}
          <div className="condition">
            <div className="section-heading">
              <h4>메일 날짜</h4>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  update(index, {
                    ...group,
                    postRule: {
                      ...group.postRule,
                      date: [...(group.postRule.date ?? []), {}],
                    },
                  })
                }
              >
                기간 추가
              </Button>
            </div>
            <p className="hint">
              기간 중 하나라도 일치하면 돼요. 기존 시각은 날짜를 수정하기 전까지
              유지됩니다.
            </p>
            {group.postRule.date?.map((range, dateIndex) => (
              <div className="date-row" key={dateIndex}>
                <Input
                  type="date"
                  aria-label={`기간 ${dateIndex + 1} 시작`}
                  value={localDate(range.startDate)}
                  onChange={(event) =>
                    update(index, {
                      ...group,
                      postRule: {
                        ...group.postRule,
                        date: group.postRule.date?.map((item, i) =>
                          i === dateIndex
                            ? {
                                ...item,
                                startDate: dateBoundary(
                                  event.target.value,
                                  false,
                                ),
                              }
                            : item,
                        ),
                      },
                    })
                  }
                />
                <span>~</span>
                <Input
                  type="date"
                  aria-label={`기간 ${dateIndex + 1} 종료`}
                  value={localDate(range.endDate)}
                  onChange={(event) =>
                    update(index, {
                      ...group,
                      postRule: {
                        ...group.postRule,
                        date: group.postRule.date?.map((item, i) =>
                          i === dateIndex
                            ? {
                                ...item,
                                endDate: dateBoundary(event.target.value, true),
                              }
                            : item,
                        ),
                      },
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    update(index, {
                      ...group,
                      postRule: {
                        ...group.postRule,
                        date: group.postRule.date?.filter(
                          (_, i) => i !== dateIndex,
                        ),
                      },
                    })
                  }
                >
                  삭제
                </Button>
              </div>
            ))}
          </div>
          <div className="condition">
            <label className="check-label">
              <input
                type="checkbox"
                checked={!!group.postRule.attachment}
                onChange={(event) =>
                  update(index, {
                    ...group,
                    postRule: {
                      ...group.postRule,
                      attachment: event.target.checked
                        ? { type: 'and', attachment: [{ ext: '' }] }
                        : undefined,
                    },
                  })
                }
              />
              첨부파일
            </label>
            {group.postRule.attachment && (
              <div className="condition-body">
                <p className="hint">
                  파일명과 확장자는 같은 첨부파일 안에서 비교합니다.
                </p>
                <Operator
                  label="첨부파일 조건 결합"
                  value={group.postRule.attachment.type}
                  onChange={(type) => {
                    const attachment = group.postRule.attachment;
                    if (attachment)
                      update(index, {
                        ...group,
                        postRule: {
                          ...group.postRule,
                          attachment: { ...attachment, type },
                        },
                      });
                  }}
                />
                {group.postRule.attachment.attachment.map(
                  (item, attachmentIndex) => (
                    <div className="attachment-row" key={attachmentIndex}>
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={!!item.filename}
                          onChange={(event) => {
                            const attachment = group.postRule.attachment;
                            if (attachment)
                              update(index, {
                                ...group,
                                postRule: {
                                  ...group.postRule,
                                  attachment: {
                                    ...attachment,
                                    attachment: attachment.attachment.map(
                                      (entry, i) =>
                                        i === attachmentIndex
                                          ? {
                                              ...entry,
                                              filename: event.target.checked
                                                ? { type: 'middle', value: '' }
                                                : undefined,
                                            }
                                          : entry,
                                    ),
                                  },
                                },
                              });
                          }}
                        />
                        파일명 조건
                      </label>
                      {item.filename && (
                        <TermEditor
                          label={`첨부파일 ${attachmentIndex + 1}`}
                          value={item.filename}
                          onChange={(filename) => {
                            const attachment = group.postRule.attachment;
                            if (attachment)
                              update(index, {
                                ...group,
                                postRule: {
                                  ...group.postRule,
                                  attachment: {
                                    ...attachment,
                                    attachment: attachment.attachment.map(
                                      (entry, i) =>
                                        i === attachmentIndex
                                          ? { ...entry, filename }
                                          : entry,
                                    ),
                                  },
                                },
                              });
                          }}
                        />
                      )}
                      <Input
                        aria-label={`첨부파일 ${attachmentIndex + 1} 확장자`}
                        placeholder="확장자 (예: pdf)"
                        value={item.ext ?? ''}
                        onChange={(event) => {
                          const attachment = group.postRule.attachment;
                          if (attachment)
                            update(index, {
                              ...group,
                              postRule: {
                                ...group.postRule,
                                attachment: {
                                  ...attachment,
                                  attachment: attachment.attachment.map(
                                    (entry, i) =>
                                      i === attachmentIndex
                                        ? {
                                            ...entry,
                                            ext:
                                              event.target.value || undefined,
                                          }
                                        : entry,
                                  ),
                                },
                              },
                            });
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          const attachment = group.postRule.attachment;
                          if (attachment)
                            update(index, {
                              ...group,
                              postRule: {
                                ...group.postRule,
                                attachment: {
                                  ...attachment,
                                  attachment: attachment.attachment.filter(
                                    (_, i) => i !== attachmentIndex,
                                  ),
                                },
                              },
                            });
                        }}
                      >
                        첨부 조건 삭제
                      </Button>
                    </div>
                  ),
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const attachment = group.postRule.attachment;
                    if (attachment)
                      update(index, {
                        ...group,
                        postRule: {
                          ...group.postRule,
                          attachment: {
                            ...attachment,
                            attachment: [...attachment.attachment, { ext: '' }],
                          },
                        },
                      });
                  }}
                >
                  첨부 조건 추가
                </Button>
              </div>
            )}
          </div>
        </section>
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onChange([...rule, newGroup()])}
      >
        또는 · 조건 그룹 추가
      </Button>
    </div>
  );
}
