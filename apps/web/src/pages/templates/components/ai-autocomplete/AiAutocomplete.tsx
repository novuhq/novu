import React, { useState, useMemo, useCallback } from 'react';
import styled from '@emotion/styled';
import { TypeAnimation } from 'react-type-animation';
import { useTheme } from '@emotion/react';

import { colors, Dropdown } from '../../../../design-system';
import { AiAutocompleteContent } from './AiAutocompleteContent';
import { MagicIcon } from './MagicIcon';
import { TranslateIcon } from './TranslateIcon';
import { useAiAutosuggestions } from './useAiAutosuggestions';
import { AiLanguagesContent } from './AiLanguagesContent';
import { useAiTranslate } from './useAiTranslate';

const AIAutocompleteHolder = styled.div`
  display: flex;
  flex-direction: column;
`;

const DropdownHolder = styled.div<{ hasError: boolean }>`
  position: relative;
  margin: 5px 0px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B20 : colors.B80)};
  background-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B40 : colors.B80)};
  transition: border-color 100ms ease;
  border-color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B30 : colors.B80)};
  background-color: transparent;

  &:focus-within {
    outline: none;
    border-color: ${colors.B60};
  }

  ${({ hasError }) => hasError && `border-color: ${colors.error};`}
`;

const LabelStyled = styled.label`
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  word-break: break-word;
  cursor: default;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B40)};
  font-weight: 700;
  font-size: 14px;
  line-height: 17px;
  margin: 5px 0px;
`;

const ErrorStyled = styled.div`
  color: inherit;
  font-size: inherit;
  line-height: 17px;
  text-decoration: none;
  word-break: break-word;
  font-size: 10px;
  line-height: 1.2;
  display: block;
  color: ${colors.error};
  font-size: 12px;
`;

const inputStyles = `
  display: block;
  width: 100%;
  height: auto;
  padding: 15px 12px;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  box-sizing: border-box;
  font-size: 14px;
  font-family: inherit;
  line-height: 16px;
  color: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.white : colors.B40)};
  text-align: left;
`;

const TextAreaStyled = styled.textarea`
  ${inputStyles};
  min-height: 80px;
`;

const InputStyled = styled.input`
  ${inputStyles};
`;

const TypedAnimationStyled = styled(TypeAnimation)`
  ${inputStyles};
  min-height: 80px;
`;

const AiButtonsHolder = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 4px;
  z-index: 9999;
`;

const MagicIconStyled = styled(MagicIcon)`
  user-select: none;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.B98)};
  border-radius: 4px;
  cursor: pointer;
  color: #b376e1;
`;

const TranslateIconStyled = styled(TranslateIcon)`
  padding: 2px;
  user-select: none;
  background: ${({ theme }) => (theme.colorScheme === 'dark' ? colors.B15 : colors.B98)};
  border-radius: 4px;
  cursor: pointer;
  color: #b376e1;
`;

enum DropdownType {
  SUGGESTIONS = 'SUGGESTIONS',
  LANGUAGES = 'LANGUAGES',
}

interface AIAutocompleteProps {
  title: string;
  channel: string;
  type: 'textarea' | 'input';
  value: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  placeholder?: string;
  onChange?: (text: string) => void;
}

export const AIAutocomplete = React.forwardRef(
  ({ title, channel, type, value, disabled, label, error, placeholder, onChange }: AIAutocompleteProps, ref: any) => {
    const [opened, setOpened] = useState(false);
    const [dropdownType, setDropdownType] = useState<DropdownType>(DropdownType.SUGGESTIONS);
    const [showSuggestion, setShowSuggestion] = useState(false);
    const { colorScheme } = useTheme();

    const { aiSuggestions, isLoading: areAutosuggestionsLoading } = useAiAutosuggestions({
      isEnabled: opened && dropdownType === DropdownType.SUGGESTIONS,
      title,
      channel,
      value,
    });

    const { aiTranslate } = useAiTranslate({
      onSuccess: (res) => {
        onChange?.(res.answer);
      },
    });

    const onLanguageClick = (lang: string) => {
      setOpened(false);
      aiTranslate({ dstLanguage: lang, prompt: value });
    };

    const onTextChange = ({ target }) => {
      onChange?.(target.value);
    };

    const onSuggestionClick = (newSuggestion: string) => {
      onChange?.(newSuggestion);
      setOpened(false);
      setShowSuggestion(true);
    };

    const onEditClick = useCallback(() => {
      setShowSuggestion(false);
      setOpened(false);
    }, [setShowSuggestion]);

    const onMagicButtonClick = useCallback<React.MouseEventHandler<SVGSVGElement>>(
      (e) => {
        e.stopPropagation();
        e.preventDefault();

        setOpened((isOpen) => !isOpen);
        setShowSuggestion(false);
        setDropdownType(DropdownType.SUGGESTIONS);
      },
      [setOpened, setDropdownType, setShowSuggestion]
    );

    const onTranslateButtonClick = useCallback<React.MouseEventHandler<SVGSVGElement>>(
      (e) => {
        e.stopPropagation();
        e.preventDefault();

        setOpened((isOpen) => !isOpen);
        setShowSuggestion(false);
        setDropdownType(DropdownType.LANGUAGES);
      },
      [setOpened, setDropdownType, setShowSuggestion]
    );

    const inputElement = useMemo(() => {
      return type === 'textarea' ? (
        <TextAreaStyled
          id="autosuggestion-input"
          ref={ref}
          value={value}
          onChange={onTextChange}
          disabled={disabled}
          placeholder={placeholder}
        />
      ) : (
        <InputStyled
          id="autosuggestion-input"
          ref={ref}
          value={value}
          onChange={onTextChange}
          disabled={disabled}
          placeholder={placeholder}
        />
      );
    }, [ref, type, value, disabled, label, error, placeholder, error, onChange]);

    return (
      <AIAutocompleteHolder>
        {label && <LabelStyled htmlFor="autosuggestion-input">{label}</LabelStyled>}
        <DropdownHolder hasError={!!error}>
          <Dropdown
            opened={opened}
            position="bottom-end"
            disabled={disabled}
            withArrow={false}
            closeOnClickOutside
            width={'100%'}
            styles={{
              itemLabel: { textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' },
              dropdown: {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: colorScheme === 'dark' ? colors.B20 : colors.B80,
              },
            }}
            control={
              !disabled && (
                <AiButtonsHolder>
                  <TranslateIconStyled onClick={onTranslateButtonClick} style={{ minHeight: 24, minWidth: 24 }} />
                  <MagicIconStyled onClick={onMagicButtonClick} style={{ minHeight: 24, minWidth: 24 }} />
                </AiButtonsHolder>
              )
            }
            onClose={() => {
              if (opened) {
                setOpened(false);
              }
            }}
          >
            {dropdownType === DropdownType.SUGGESTIONS && (
              <AiAutocompleteContent
                isLoading={areAutosuggestionsLoading}
                suggestions={aiSuggestions?.answer}
                onSuggestionClick={onSuggestionClick}
              />
            )}
            {dropdownType === DropdownType.LANGUAGES && <AiLanguagesContent onLanguageClick={onLanguageClick} />}
          </Dropdown>
          {showSuggestion ? (
            <div onClick={onEditClick}>
              <TypedAnimationStyled sequence={[value]} wrapper="div" cursor={false} repeat={0} speed={60} />
            </div>
          ) : (
            inputElement
          )}
        </DropdownHolder>
        {error && <ErrorStyled>{error}</ErrorStyled>}
      </AIAutocompleteHolder>
    );
  }
);
