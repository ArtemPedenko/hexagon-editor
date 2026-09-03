export interface ClassNameProps {
  className?: string;
}

export type ClassNameModifierValue = boolean | number | string | null | undefined;
export type ClassNameModifiers = Readonly<Record<string, ClassNameModifierValue>>;
export type ClassNameMix = string | null | undefined | readonly ClassNameMix[];

export interface BlockClassName {
  (modifiers?: ClassNameModifiers | null, mix?: ClassNameMix): string;
  (element: string, modifiers?: ClassNameModifiers | null, mix?: ClassNameMix): string;
}

/** Dependency-free BEM classname helper using the Hexagon Markdown namespace. */
export function cn(block: string): BlockClassName {
  const blockClass = `hx-md-${block}`;
  return ((
    elementOrModifiers?: string | ClassNameModifiers | null,
    modifiersOrMix?: ClassNameModifiers | ClassNameMix | null,
    maybeMix?: ClassNameMix,
  ) => {
    const element = typeof elementOrModifiers === 'string' ? elementOrModifiers : undefined;
    const base = element === undefined ? blockClass : `${blockClass}__${element}`;
    const modifiers = (element === undefined ? elementOrModifiers : modifiersOrMix) as
      ClassNameModifiers | null | undefined;
    const mix = element === undefined ? (modifiersOrMix as ClassNameMix) : maybeMix;
    const classes = [base];
    for (const [name, value] of Object.entries(modifiers ?? {})) {
      if (value === false || value === null || value === undefined) continue;
      classes.push(value === true ? `${base}_${name}` : `${base}_${name}_${value}`);
    }
    appendMix(classes, mix);
    return classes.join(' ');
  }) as BlockClassName;
}

function appendMix(classes: string[], mix: ClassNameMix): void {
  if (Array.isArray(mix)) {
    for (const item of mix) appendMix(classes, item);
  } else if (typeof mix === 'string' && mix.length > 0) {
    classes.push(mix);
  }
}
