// 三张学习卡片（单词森林 / 汉字图书塔 / 朗诵小舞台）的标记构造。
// 共同骨架（顶行、进度区、图片区、底部动作）在这里统一，三张卡只提供各自的内容与配色。

import { HANZI_SCENES } from './content-catalog.js';
import { escapeHtml } from './utils.js';

const LESSON_GROUP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const WRITER_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>';

export function lessonGroupChipMarkup({ id, count, unit }) {
  return `<button class="lesson-group-chip" id="${id}" type="button" aria-label="查看本组${unit}，共 ${count} 个">${LESSON_GROUP_ICON}本组(${count})</button>`;
}

export function lessonImageToggleMarkup({ id, active }) {
  return `<button class="lesson-image-toggle-btn ${active ? 'is-active' : ''}" id="${id}" type="button" aria-pressed="${active}" aria-label="切换是否开启看图识字">
      <span class="lesson-toggle-icon" aria-hidden="true">🖼️</span>
      <span class="lesson-toggle-label">看图识字</span>
      <span class="lesson-toggle-switch" aria-hidden="true"><i class="lesson-toggle-knob"></i></span>
    </button>`;
}

export function lessonCardTopline(kicker, actions, extraClass = '') {
  return `<div class="lesson-card-topline ${extraClass}"><p class="lesson-card-kicker">${kicker}</p><span class="lesson-card-actions">${actions}</span></div>`;
}

// 分组所在位置（目录 / 分组名），三张卡片统一用它做顶行标题
export function lessonGroupPathLabel(group) {
  if (!group) return '';
  return [group.directory, group.name].filter(Boolean).join(' / ');
}

export function lessonCardProgress() {
  return '<div class="card-progress" id="cardProgressHost"></div>';
}

export function lessonCardImage(src, alt, visible = true, extraClass = '', id = '', imgClass = '') {
  if (!src) return '';
  return `<div class="lesson-card-image ${visible ? '' : 'is-hidden'} ${extraClass}"${id ? ` id="${id}"` : ''}><img${imgClass ? ` class="${imgClass}"` : ''} src="${src}" alt="${escapeHtml(alt)}" /></div>`;
}

// 卡片顶部的装饰帷幕（朗诵台与单词森林共用）
export function lessonCardCurtainMarkup() {
  return '<div class="lesson-card-curtain" aria-hidden="true"><i></i><i></i></div>';
}

export function lessonPrimaryActionsMarkup(name = '') {
  return `<div class="lesson-action-stack">${name ? `<strong class="word-action-name">${escapeHtml(name)}</strong>` : ''}<div class="lesson-primary-actions"><button class="repeat-current-button" id="repeatCurrent" type="button" aria-label="再读一遍，可按 R 键触发"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4.5l5 4.5V4.5L7.5 9H3z" fill="currentColor"/><path d="M16 8.5c1.2 1 2 2.2 2 3.5s-.8 2.5-2 3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M19 5.5c2.3 1.8 3.5 4.1 3.5 6.5s-1.2 4.7-3.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><span>再读一遍</span><kbd aria-hidden="true">R</kbd></button><button class="primary-button" id="learnNext" type="button" disabled aria-disabled="true"><span class="learn-next-copy"><span id="learnNextLabel">继续</span></span></button></div></div>`;
}

export function hanziSceneMarkup(word) {
  const scene = HANZI_SCENES[word];
  if (!scene) return '';
  return `<div class="hanzi-scene scene-${scene.art}" aria-label="${scene.label}"><i></i><i></i><i></i><span>${scene.label}</span></div>`;
}

/** 单词森林：文字在上、插图在下（插图区可整体收起）。 */
export function englishLearnCardMarkup({ word, note, image, groupPath, groupCount, hasImage, showImage, sentence, actions, recording = '' }) {
  const toggle = hasImage ? lessonImageToggleMarkup({ id: 'englishImageToggleBtn', active: showImage }) : '';
  const topline = lessonCardTopline(escapeHtml(groupPath), `${toggle}${lessonGroupChipMarkup({ id: 'openEnglishGroupBtn', count: groupCount, unit: '单词' })}`);
  // 插图只要这一回合有就渲染（内置的色彩/数字主题始终显示）；英文分组由"看图识字"开关控制显隐
  const imageArea = image ? lessonCardImage(image, `${word} 的配图`, showImage, 'learn-word-image-holder', 'learnCardImageHolder') : '';
  return `<div class="learn-word-card">${lessonCardCurtainMarkup()}${topline}${lessonCardProgress()}<div class="learn-word-copy"><p>看一看，听一听</p><h2>${escapeHtml(word)}</h2><span>${escapeHtml(note)}</span></div>${imageArea}${sentence}${actions}${recording}</div>`;
}

/** 汉字图书塔：大字 + 可收起的插图 + 笔顺练习入口。 */
export function hanziLearnCardMarkup({ word, totalWords, isImageGroup, showImage, imageUrl, groupPath, actions, recording = '' }) {
  const toggle = isImageGroup ? lessonImageToggleMarkup({ id: 'hanziImageToggleBtn', active: showImage }) : '';
  const illustration = isImageGroup ? lessonCardImage(imageUrl, `${word} 的配图`, showImage, 'hanzi-illustration-holder', 'hanziCardIllustrationHolder', 'hanzi-illustration-img') : '';
  return `<article class="hanzi-spellbook ${isImageGroup ? 'has-illustration-mode' : ''} ${showImage ? 'image-visible' : 'image-hidden'}">
      ${lessonCardCurtainMarkup()}
      ${lessonCardTopline(escapeHtml(groupPath), `${toggle}${lessonGroupChipMarkup({ id: 'hanziSpellbookGroupBtn', count: totalWords, unit: '汉字' })}`, 'hanzi-book-topline')}
      ${lessonCardProgress()}
      <button class="hanzi-glyph" data-hanzi-length="${[...word].length}" id="hanziSpeak" type="button" aria-label="朗读 ${escapeHtml(word)}">
        <b>${escapeHtml(word)}</b>
        <small>点一下，听读音</small>
      </button>
      ${illustration}
      <div class="hanzi-writer-entry">
        <button class="hanzi-writer-entry-btn" id="openHanziWriterBtn" type="button" aria-label="练习写字与笔顺描红">
          ${WRITER_ICON}
          <span>练习写字 (笔顺描红)</span>
        </button>
      </div>
      ${hanziSceneMarkup(word)}
      ${actions}
      ${recording}
    </article>`;
}

/** 朗诵小舞台：模式切换 + 稿件 + 朗读提示。 */
export function recitalLearnCardMarkup({ title, directory, wholePiece, modeSwitch, gapRow, manuscript, hint, tip, actions, recording = '' }) {
  return `<article class="recital-card ${wholePiece ? 'is-whole-piece' : ''}">
      ${lessonCardCurtainMarkup()}
      ${lessonCardTopline(escapeHtml(directory), '', 'recital-card-topline')}
      <div class="recital-head-row">${modeSwitch}${gapRow}</div>
      <h2>${escapeHtml(title)}</h2>
      ${lessonCardProgress()}
      <button class="recital-text ${wholePiece ? 'whole-piece' : ''}" id="reciteListen" type="button" aria-label="播放《${escapeHtml(title)}》朗诵">${manuscript}<small id="reciteHint">${hint}</small></button>
      <p class="recital-tip">${tip}</p>
      ${actions}
      ${recording}
    </article>`;
}
