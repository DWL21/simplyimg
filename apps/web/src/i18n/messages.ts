import { useSyncExternalStore } from 'react';
import { acceptedImageFormatsHint, acceptedImageFormatsKicker } from '../lib/formatUtils';

const allToolIds = ['compress', 'resize', 'convert', 'crop', 'rotate', 'flip'] as const;
const cardToolIds = ['compress', 'resize', 'convert'] as const;

type ToolId = (typeof allToolIds)[number];
type CardToolId = (typeof cardToolIds)[number];
type DocumentLike = {
  documentElement: {
    lang: string;
  };
};

type ToolCardCopy = {
  name: string;
  label: string;
  description: string;
  details: string;
};

type LocaleMessages = {
  brand: {
    name: string;
    tagline: string;
  };
  language: {
    label: string;
    english: string;
    korean: string;
  };
  footer: {
    privacyPolicy: string;
    termsOfService: string;
  };
  legal: {
    backHome: string;
  };
  home: {
    eyebrow: string;
    title: string;
    description: string;
    currentFeaturesTitle: string;
    currentFeaturesValue: string;
    currentFeaturesDescription: string;
  };
  modeSelect: {
    title: string;
    imageSectionLabel: string;
    imageSectionTitle: string;
    documentSectionLabel: string;
    documentSectionTitle: string;
    documentSectionDescription: string;
    documentToolTitle: string;
    documentToolDescription: string;
    documentEditorTitle: string;
    documentEditorDescription: string;
    documentOpenTitle: string;
    documentOpenDescription: string;
    toolDescriptions: Record<ToolId, string>;
  };
  toolCard: {
    start: string;
  };
  workspace: {
    titlePrefix: string;
    uploaded: string;
    completed: string;
    notProcessed: string;
    selectImagesTitle: string;
    selectImagesDescription: string;
    newTask: string;
    selectedFilesTitle: string;
    selectedFilesDescription: string;
    previewTitle: string;
    previewDescription: string;
    original: string;
    processed: string;
    originalEmpty: string;
    processedEmpty: string;
    selectedInfoTitle: string;
    selectedInfoDescription: string;
    fileName: string;
    originalSize: string;
    dimensions: string;
    format: string;
    optionsTitle: string;
    optionsDescription: string;
    downloadAll: string;
    processing: string;
  };
  toolLabels: Record<ToolId, string>;
  tools: Record<
    CardToolId,
    ToolCardCopy & {
      workspaceTitle: string;
      workspaceDescription: string;
      processLabel: string;
    }
  >;
  dropzone: {
    formats: string;
    title: string;
    description: string;
    button: string;
  };
  imageUpload: {
    back: string;
    dropTitle: string;
    dropDescription: string;
    hint: string;
    remove: string;
    addFiles: string;
    chooseFiles: string;
    confirm: string;
  };
  fileList: {
    empty: string;
    done: string;
    remove: string;
  };
  download: {
    title: string;
    description: string;
    empty: string;
    itemAction: string;
  };
  options: {
    compress: {
      strengthTitle: string;
      strengthDescription: string;
      quality: string;
      highCompression: string;
      balanced: string;
      highQuality: string;
      outputFormatTitle: string;
      outputFormatDescription: string;
    };
    resize: {
      sizeTitle: string;
      sizeDescription: string;
      width: string;
      height: string;
    };
    convert: {
      outputTitle: string;
      outputDescription: string;
      input: string;
      output: string;
      qualityTitle: string;
      qualityDescription: string;
      quality: string;
    };
  };
  editor: {
    backHome: string;
    addFiles: string;
    remove: string;
    emptyDropTitle: string;
    emptyPreview: string;
    alignCenter: string;
    zoomIn: string;
    zoomOut: string;
    zoomFit: string;
    zoomPresetFit: string;
    optionsSuffix: string;
    emptyStatePrefix: string;
    emptyStateSuffix: string;
    doneTitle: string;
    resetCurrentImage: string;
    processing: string;
    applyPrefix: string;
    downloadAll: string;
  };
  document: {
    back: string;
    backHome: string;
    backEditor: string;
    title: string;
    dropTitle: string;
    dropDescription: string;
    replaceFile: string;
    previewLoading: string;
    previewFailed: string;
    exportTitle: string;
    fileName: string;
    titlePosition: string;
    pageNumbers: string;
    dateLabel: string;
    bodyScale: string;
    hidden: string;
    header: string;
    footer: string;
    show: string;
    pageNumberPrefix: string;
    pageNumberExample: string;
    pageCountLabel: string;
    previewFrameTitle: string;
    savePreparing: string;
    save: string;
    removeFile: string;
  };
  markdownEditor: {
    backHome: string;
    title: string;
    fileNameLabel: string;
    sourceLabel: string;
    preview: string;
    edit: string;
    fileNamePlaceholder: string;
    sourcePlaceholder: string;
    saveMarkdown: string;
    savePdf: string;
    openingPdf: string;
    previewLoading: string;
    previewEmpty: string;
    previewFailed: string;
    openPdfDescription: string;
  };
  imagePreview: {
    empty: string;
  };
  common: {
    none: string;
  };
};

const localeMessages: Record<'ko' | 'en', LocaleMessages> = {
  ko: {
    brand: {
      name: 'SimplyImg',
      tagline: 'simple image toolkit',
    },
    language: {
      label: '언어',
      english: 'English',
      korean: '한국어',
    },
    footer: {
      privacyPolicy: '개인정보 처리방침',
      termsOfService: '이용약관',
    },
    legal: {
      backHome: '← 홈으로',
    },
    home: {
      eyebrow: 'SIMPLYIMG',
      title: '모드만 고르고 바로 이미지 작업을 시작하세요.',
      description:
        '첫 화면에서는 필요한 작업만 선택합니다. 진입 후에는 여러 이미지를 한 번에 업로드하고, 오른쪽 패널에서 옵션을 조절한 뒤 바로 처리할 수 있습니다.',
      currentFeaturesTitle: '현재 제공 기능',
      currentFeaturesValue: '이미지 압축, 이미지 크기 조절, 이미지 형식 변환',
      currentFeaturesDescription: '복잡한 설정 없이 바로 쓸 수 있는 흐름만 남겼습니다.',
    },
    modeSelect: {
      title: '지금 필요한 작업을 바로 시작하세요',
      imageSectionLabel: 'IMAGE',
      imageSectionTitle: '이미지 작업',
      documentSectionLabel: 'DOCUMENT',
      documentSectionTitle: '문서 작업',
      documentSectionDescription: '새 MD 파일을 작성하거나, 기존 MD 파일을 열어 수정한 뒤 PDF로 저장할 수 있습니다.',
      documentToolTitle: 'Markdown을 PDF로 변환',
      documentToolDescription: '완성된 Markdown 파일을 불러와 PDF로 저장합니다.',
      documentEditorTitle: '새 Markdown 작성하기',
      documentEditorDescription: '비어 있는 새 MD 파일을 처음부터 작성합니다.',
      documentOpenTitle: 'MD 파일 편집',
      documentOpenDescription: '편집 화면에서 기존 MD 파일을 불러와 이어서 수정합니다.',
      toolDescriptions: {
        compress: '파일 크기를 줄이고 품질을 최적화합니다',
        resize: '가로/세로 픽셀 크기를 바꿉니다',
        convert: 'JPEG · JPG · PNG · WebP · SVG를 지원합니다',
        crop: '드래그로 원하는 영역을 선택합니다',
        rotate: '90° · 180° · 270° 방향을 바꿉니다',
        flip: '좌우 또는 상하로 뒤집습니다',
      },
    },
    toolCard: {
      start: '시작하기',
    },
    workspace: {
      titlePrefix: 'SIMPLYIMG',
      uploaded: '업로드',
      completed: '완료',
      notProcessed: '처리 전',
      selectImagesTitle: '이미지 선택',
      selectImagesDescription: '여러 이미지를 한 번에 넣고 바로 작업할 수 있습니다.',
      newTask: '새 작업',
      selectedFilesTitle: '선택한 파일',
      selectedFilesDescription: '목록에서 파일을 고르면 오른쪽 미리보기가 바뀝니다.',
      previewTitle: '미리보기',
      previewDescription: '선택한 파일 기준으로 원본과 결과를 비교합니다.',
      original: '원본',
      processed: '결과',
      originalEmpty: '이미지를 선택하면 여기에 원본이 표시됩니다.',
      processedEmpty: '처리를 실행하면 결과가 여기에 표시됩니다.',
      selectedInfoTitle: '선택한 파일 정보',
      selectedInfoDescription: '작업 전 확인이 필요한 기본 정보입니다.',
      fileName: '파일명',
      originalSize: '원본 크기',
      dimensions: '해상도',
      format: '형식',
      optionsTitle: '옵션',
      optionsDescription: '오른쪽 패널에서 세부 설정을 고른 뒤 바로 실행합니다.',
      downloadAll: '전체 다운로드',
      processing: '처리 중...',
    },
    toolLabels: {
      compress: '압축',
      resize: '크기 조절',
      convert: '형식 변환',
      crop: '자르기',
      rotate: '회전',
      flip: '반전',
    },
    tools: {
      compress: {
        name: '이미지 압축',
        label: 'COMPRESS',
        description: '여러 이미지를 한 번에 압축하고 용량을 줄입니다.',
        details: 'JPG, PNG, WebP, SVG 출력 지원',
        workspaceTitle: '이미지 압축',
        workspaceDescription: '여러 이미지를 업로드하고 품질과 포맷을 정한 뒤 한 번에 압축합니다.',
        processLabel: '이미지 압축',
      },
      resize: {
        name: '이미지 크기 조절',
        label: 'RESIZE',
        description: '가로와 세로 크기를 지정한 값으로 강제 변경합니다.',
        details: '정확한 픽셀 크기, 프레임 이동, 실시간 미리보기',
        workspaceTitle: '이미지 크기 조절',
        workspaceDescription: '목표 크기를 정하고 프레임을 움직여 보이는 영역을 맞춘 뒤 여러 이미지를 한 번에 변경합니다.',
        processLabel: '크기 조절',
      },
      convert: {
        name: '이미지 형식 변환',
        label: 'CONVERT',
        description: 'JPEG, JPG, PNG, WebP, SVG 형식을 지원합니다.',
        details: '다양한 입력 호환, 출력 포맷 선택, 일괄 다운로드',
        workspaceTitle: '이미지 형식 변환',
        workspaceDescription: '다양한 형식의 이미지를 JPG, PNG, WebP, SVG 중 원하는 형식으로 변환합니다.',
        processLabel: '형식 변환',
      },
    },
    dropzone: {
      formats: acceptedImageFormatsKicker,
      title: '이미지 선택하기',
      description: '여러 파일을 한 번에 추가할 수 있습니다. 드래그 앤 드롭도 지원합니다.',
      button: '파일 고르기',
    },
    imageUpload: {
      back: '← 뒤로',
      dropTitle: '이미지를 끌어다 놓거나',
      dropDescription: '클릭해서 파일을 선택하세요',
      hint: `${acceptedImageFormatsHint} · 여러 파일 동시 가능`,
      remove: '삭제',
      addFiles: '+ 파일 추가',
      chooseFiles: '파일 선택',
      confirm: '확인 →',
    },
    fileList: {
      empty: '아직 업로드된 파일이 없습니다.',
      done: '완료',
      remove: '삭제',
    },
    download: {
      title: '결과 파일',
      description: '처리가 끝난 파일을 개별 다운로드하거나 한 번에 받을 수 있습니다.',
      empty: '아직 처리된 파일이 없습니다.',
      itemAction: '다운로드',
    },
    options: {
      compress: {
        strengthTitle: '압축 강도',
        strengthDescription: '값이 낮을수록 파일 크기는 더 작아지고 화질 손실은 커집니다.',
        quality: '품질',
        highCompression: '고압축',
        balanced: '균형',
        highQuality: '고화질',
        outputFormatTitle: '출력 포맷',
        outputFormatDescription: '필요한 포맷으로 바로 저장할 수 있습니다.',
      },
      resize: {
        sizeTitle: '크기 지정',
        sizeDescription: '입력한 가로/세로 크기로 출력되고, 왼쪽 미리보기에서 프레임 위치를 움직여 보이는 영역을 맞출 수 있습니다.',
        width: '가로',
        height: '세로',
      },
      convert: {
        outputTitle: '출력 형식',
        outputDescription: '업로드한 이미지를 JPG, PNG, WebP, SVG 중 원하는 형식으로 변환할 수 있습니다.',
        input: 'INPUT',
        output: 'OUTPUT',
        qualityTitle: 'JPG 품질',
        qualityDescription: '일반적인 웹 용도라면 80~88 사이가 가장 무난합니다.',
        quality: '품질',
      },
    },
    editor: {
      backHome: '← 처음으로',
      addFiles: '+ 파일 추가',
      remove: '삭제',
      emptyDropTitle: '이미지를 끌어다 놓거나 클릭하여 추가',
      emptyPreview: '이미지를 선택하세요',
      alignCenter: '정렬',
      zoomIn: '확대',
      zoomOut: '축소',
      zoomFit: '맞춤 (더블클릭)',
      zoomPresetFit: '맞춤',
      optionsSuffix: '옵션',
      emptyStatePrefix: '이미지를 추가하면',
      emptyStateSuffix: '기능을 사용할 수 있습니다',
      doneTitle: '처리 완료',
      resetCurrentImage: '현재 이미지 변경사항 초기화',
      processing: '처리 중…',
      applyPrefix: '',
      downloadAll: '전체 다운로드',
    },
    document: {
      back: '← 뒤로',
      backHome: '← 처음으로',
      backEditor: '← 에디터로 돌아가기',
      title: 'Markdown → PDF',
      dropTitle: 'Markdown 파일을 끌어다 놓거나',
      dropDescription: '클릭해서 파일을 선택하세요',
      replaceFile: '파일 바꾸기',
      previewLoading: '미리보기를 준비하는 중입니다.',
      previewFailed: '미리보기를 불러오지 못했습니다.',
      exportTitle: 'PDF 내보내기',
      fileName: '파일명',
      titlePosition: '제목 위치',
      pageNumbers: '페이지 번호',
      dateLabel: '날짜 표기',
      bodyScale: '본문 크기',
      hidden: '표시 안함',
      header: '머리말',
      footer: '꼬리말',
      show: '표시',
      pageNumberPrefix: '페이지 ',
      pageNumberExample: '페이지 1, 페이지 2…',
      pageCountLabel: '페이지',
      previewFrameTitle: 'A4 미리보기',
      savePreparing: '저장 준비 중…',
      save: '저장하기',
      removeFile: '파일 제거',
    },
    markdownEditor: {
      backHome: '← 처음으로',
      title: 'Markdown 작성하기',
      fileNameLabel: '파일명',
      sourceLabel: '본문',
      preview: '미리보기',
      edit: '편집',
      fileNamePlaceholder: '새문서.md',
      sourcePlaceholder: '# 제목\n\n본문을 작성하세요.',
      saveMarkdown: 'MD 파일로 저장하기',
      savePdf: 'PDF로 저장하기',
      openingPdf: 'PDF 화면 여는 중…',
      previewLoading: '미리보기를 불러오는 중…',
      previewEmpty: '표시할 Markdown 내용이 없습니다.',
      previewFailed: 'Markdown 미리보기를 불러오지 못했습니다.',
      openPdfDescription: '현재 작성한 본문을 기존 Markdown → PDF 화면으로 넘깁니다.',
    },
    imagePreview: {
      empty: '표시할 이미지가 없습니다.',
    },
    common: {
      none: '-',
    },
  },
  en: {
    brand: {
      name: 'SimplyImg',
      tagline: 'simple image toolkit',
    },
    language: {
      label: 'Language',
      english: 'English',
      korean: '한국어',
    },
    footer: {
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
    },
    legal: {
      backHome: '← Back home',
    },
    home: {
      eyebrow: 'SIMPLYIMG',
      title: 'Pick a mode and start working right away.',
      description:
        'The first screen only asks what you need to do. Once inside, you can upload multiple images, adjust options in the right panel, and process them immediately.',
      currentFeaturesTitle: 'Available now',
      currentFeaturesValue: 'Image compression, image resize, image format conversion',
      currentFeaturesDescription: 'Only the workflow you actually need stays on screen.',
    },
    modeSelect: {
      title: 'Start the task you need right now',
      imageSectionLabel: 'IMAGE',
      imageSectionTitle: 'Image tools',
      documentSectionLabel: 'DOCUMENT',
      documentSectionTitle: 'Document tools',
      documentSectionDescription: 'Create a new MD file, open an existing one to edit it, or save Markdown as PDF.',
      documentToolTitle: 'Convert Markdown to PDF',
      documentToolDescription: 'Load a finished Markdown file and save it as a PDF.',
      documentEditorTitle: 'Write New Markdown',
      documentEditorDescription: 'Start a blank MD file and write it from scratch.',
      documentOpenTitle: 'Edit MD File',
      documentOpenDescription: 'Open an existing MD file in the editor and continue working on it.',
      toolDescriptions: {
        compress: 'Reduce file size and optimize quality',
        resize: 'Change the image width and height in pixels',
        convert: 'Supports JPEG · JPG · PNG · WebP · SVG',
        crop: 'Select the area you want by dragging',
        rotate: 'Rotate to 90° · 180° · 270° orientations',
        flip: 'Flip horizontally or vertically',
      },
    },
    toolCard: {
      start: 'Start',
    },
    workspace: {
      titlePrefix: 'SIMPLYIMG',
      uploaded: 'Uploaded',
      completed: 'Completed',
      notProcessed: 'Not processed',
      selectImagesTitle: 'Select images',
      selectImagesDescription: 'Add multiple images at once and process them right away.',
      newTask: 'New task',
      selectedFilesTitle: 'Selected files',
      selectedFilesDescription: 'Pick a file from the list to update the preview on the right.',
      previewTitle: 'Preview',
      previewDescription: 'Compare the original and processed image for the selected file.',
      original: 'Original',
      processed: 'Processed',
      originalEmpty: 'Select an image to show the original preview here.',
      processedEmpty: 'Run processing to show the result preview here.',
      selectedInfoTitle: 'Selected file info',
      selectedInfoDescription: 'Basic file details before you run the job.',
      fileName: 'File name',
      originalSize: 'Original size',
      dimensions: 'Dimensions',
      format: 'Format',
      optionsTitle: 'Options',
      optionsDescription: 'Choose the settings in the right panel, then run the job.',
      downloadAll: 'Download all',
      processing: 'Processing...',
    },
    toolLabels: {
      compress: 'Compress',
      resize: 'Resize',
      convert: 'Convert',
      crop: 'Crop',
      rotate: 'Rotate',
      flip: 'Flip',
    },
    tools: {
      compress: {
        name: 'Compress Images',
        label: 'COMPRESS',
        description: 'Compress multiple images at once and reduce file size.',
        details: 'JPG, PNG, WebP, SVG output support',
        workspaceTitle: 'Compress Images',
        workspaceDescription: 'Upload multiple images, choose quality and format, then compress them in one run.',
        processLabel: 'Compress images',
      },
      resize: {
        name: 'Resize Images',
        label: 'RESIZE',
        description: 'Force images to the exact width and height you enter.',
        details: 'Exact pixel size, movable frame, live preview',
        workspaceTitle: 'Resize Images',
        workspaceDescription: 'Set the target size, reposition the frame on the image, and resize the full batch at once.',
        processLabel: 'Resize images',
      },
      convert: {
        name: 'Convert Image Formats',
        label: 'CONVERT',
        description: 'Convert images to JPG, PNG, WebP, or SVG.',
        details: 'Broad input compatibility, output format choice, batch export',
        workspaceTitle: 'Convert Image Formats',
        workspaceDescription: 'Convert uploaded images into JPG, PNG, WebP, or SVG in one batch.',
        processLabel: 'Convert formats',
      },
    },
    dropzone: {
      formats: acceptedImageFormatsKicker,
      title: 'Select images',
      description: 'You can add multiple files at once. Drag and drop is supported too.',
      button: 'Choose files',
    },
    imageUpload: {
      back: '← Back',
      dropTitle: 'Drag and drop images',
      dropDescription: 'or click to choose files',
      hint: `${acceptedImageFormatsHint} · multiple files supported`,
      remove: 'Remove',
      addFiles: '+ Add files',
      chooseFiles: 'Choose files',
      confirm: 'Continue →',
    },
    fileList: {
      empty: 'No files uploaded yet.',
      done: 'Done',
      remove: 'Remove',
    },
    download: {
      title: 'Results',
      description: 'Download files one by one or get the whole batch at once.',
      empty: 'No processed files yet.',
      itemAction: 'Download',
    },
    options: {
      compress: {
        strengthTitle: 'Compression strength',
        strengthDescription: 'Lower values reduce file size more aggressively but add more quality loss.',
        quality: 'Quality',
        highCompression: 'High compression',
        balanced: 'Balanced',
        highQuality: 'High quality',
        outputFormatTitle: 'Output format',
        outputFormatDescription: 'Save directly in the format you need.',
      },
      resize: {
        sizeTitle: 'Target size',
        sizeDescription: 'Each image is exported at the exact width and height you enter, and you can reposition the frame in the preview.',
        width: 'Width',
        height: 'Height',
      },
      convert: {
        outputTitle: 'Output format',
        outputDescription: 'Convert uploaded images into JPG, PNG, WebP, or SVG.',
        input: 'INPUT',
        output: 'OUTPUT',
        qualityTitle: 'JPG quality',
        qualityDescription: 'For most web use cases, 80 to 88 is a solid default range.',
        quality: 'Quality',
      },
    },
    editor: {
      backHome: '← Home',
      addFiles: '+ Add files',
      remove: 'Remove',
      emptyDropTitle: 'Drag images here or click to add',
      emptyPreview: 'Select an image',
      alignCenter: 'Center',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      zoomFit: 'Fit (double-click)',
      zoomPresetFit: 'Fit',
      optionsSuffix: 'options',
      emptyStatePrefix: 'Add images to use',
      emptyStateSuffix: '',
      doneTitle: 'Processing complete',
      resetCurrentImage: 'Reset changes for the current image',
      processing: 'Processing…',
      applyPrefix: 'Apply',
      downloadAll: 'Download all',
    },
    document: {
      back: '← Back',
      backHome: '← Home',
      backEditor: '← Back to editor',
      title: 'Markdown → PDF',
      dropTitle: 'Drag and drop a Markdown file',
      dropDescription: 'or click to choose a file',
      replaceFile: 'Replace file',
      previewLoading: 'Preparing the preview.',
      previewFailed: 'Could not load the preview.',
      exportTitle: 'PDF export',
      fileName: 'File name',
      titlePosition: 'Title position',
      pageNumbers: 'Page numbers',
      dateLabel: 'Date',
      bodyScale: 'Body scale',
      hidden: 'Hidden',
      header: 'Header',
      footer: 'Footer',
      show: 'Show',
      pageNumberPrefix: 'Page ',
      pageNumberExample: 'Page 1, Page 2...',
      pageCountLabel: 'pages',
      previewFrameTitle: 'A4 preview',
      savePreparing: 'Preparing file…',
      save: 'Save PDF',
      removeFile: 'Remove file',
    },
    markdownEditor: {
      backHome: '← Home',
      title: 'Write Markdown',
      fileNameLabel: 'File name',
      sourceLabel: 'Markdown source',
      preview: 'Preview',
      edit: 'Edit',
      fileNamePlaceholder: 'untitled.md',
      sourcePlaceholder: '# Title\n\nWrite your Markdown source here.',
      saveMarkdown: 'Save as MD',
      savePdf: 'Save as PDF',
      openingPdf: 'Opening PDF view…',
      previewLoading: 'Loading preview…',
      previewEmpty: 'There is no Markdown content to preview.',
      previewFailed: 'Failed to load the Markdown preview.',
      openPdfDescription: 'Send the current Markdown source to the existing Markdown → PDF screen.',
    },
    imagePreview: {
      empty: 'No image to display.',
    },
    common: {
      none: '-',
    },
  },
};

export type AppLocale = keyof typeof localeMessages;

function detectNavigatorLocale(): AppLocale {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const candidates = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];
  const hasKorean = candidates.some((locale) => locale.toLowerCase().startsWith('ko'));
  return hasKorean ? 'ko' : 'en';
}

function applyDocumentLocale(locale: AppLocale) {
  const documentRef = typeof globalThis !== 'undefined' && 'document' in globalThis
    ? (globalThis as { document?: DocumentLike }).document ?? null
    : null;

  if (documentRef) {
    documentRef.documentElement.lang = locale;
  }
}

export function resolveLocale(locale?: string): AppLocale {
  if (!locale) {
    return 'en';
  }

  return locale.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let currentLocale: AppLocale = detectNavigatorLocale();

applyDocumentLocale(currentLocale);

const listeners = new Set<() => void>();

function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentLocale() {
  return currentLocale;
}

export function setAppLocale(locale: AppLocale) {
  const nextLocale = resolveLocale(locale);
  if (nextLocale === currentLocale) {
    return;
  }

  currentLocale = nextLocale;
  applyDocumentLocale(nextLocale);
  listeners.forEach((listener) => listener());
}

export function useAppLocale() {
  return useSyncExternalStore(subscribeLocale, getCurrentLocale, getCurrentLocale);
}

export function getMessages(locale: string = getCurrentLocale()) {
  return localeMessages[resolveLocale(locale)];
}

export function useLocaleMessages() {
  const locale = useAppLocale();
  return getMessages(locale);
}

export function useI18n() {
  const locale = useAppLocale();
  return {
    locale,
    messages: getMessages(locale),
    setLocale: setAppLocale,
  };
}

export function getToolCardEntries(locale: string = getCurrentLocale()) {
  const messages = getMessages(locale);

  return cardToolIds.map((tool) => ({
    tool,
    path: `/${tool}`,
    ...messages.tools[tool],
  }));
}

export function getLanguageLabel(locale: AppLocale) {
  const messages = getMessages(locale);
  return locale === 'ko' ? messages.language.korean : messages.language.english;
}

export function getToolLabel(tool: ToolId, locale: string = getCurrentLocale()) {
  return getMessages(locale).toolLabels[tool];
}

export function formatFileCount(locale: string, count: number) {
  return resolveLocale(locale) === 'ko'
    ? `${count}개 파일`
    : `${count} file${count === 1 ? '' : 's'}`;
}

export function formatSelectedCount(locale: string, count: number) {
  return resolveLocale(locale) === 'ko'
    ? `${count}개 선택됨`
    : `${count} selected`;
}

export function formatPageCount(locale: string, count: number) {
  return resolveLocale(locale) === 'ko'
    ? `${count}페이지`
    : `${count} page${count === 1 ? '' : 's'}`;
}

export function formatPageLabel(locale: string, pageIndex: number) {
  return resolveLocale(locale) === 'ko'
    ? `${pageIndex + 1}페이지`
    : `Page ${pageIndex + 1}`;
}

export function formatPagePreviewLabel(locale: string, pageIndex: number) {
  return resolveLocale(locale) === 'ko'
    ? `${pageIndex + 1}페이지 미리보기`
    : `Page ${pageIndex + 1} preview`;
}

export function formatOriginalAlt(locale: string, fileName?: string) {
  return fileName
    ? resolveLocale(locale) === 'ko'
      ? `${fileName} 원본`
      : `${fileName} original`
    : resolveLocale(locale) === 'ko'
      ? '원본 미리보기'
      : 'Original preview';
}

export function formatProcessedAlt(locale: string, fileName?: string) {
  return fileName
    ? resolveLocale(locale) === 'ko'
      ? `${fileName} 결과`
      : `${fileName} result`
    : resolveLocale(locale) === 'ko'
      ? '결과 미리보기'
      : 'Result preview';
}

export function formatLocaleDate(locale: string, date: Date) {
  const resolvedLocale = resolveLocale(locale);
  return new Intl.DateTimeFormat(resolvedLocale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatToolReadyMessage(locale: string, toolLabel: string) {
  return resolveLocale(locale) === 'ko'
    ? `이미지를 추가하면 ${toolLabel} 기능을 사용할 수 있습니다`
    : `Add images to use ${toolLabel}.`;
}

export function formatApplyToolLabel(locale: string, toolLabel: string) {
  return resolveLocale(locale) === 'ko'
    ? `${toolLabel} 적용`
    : `Apply ${toolLabel}`;
}

export function formatDownloadAllLabel(locale: string, count: number) {
  return resolveLocale(locale) === 'ko'
    ? `전체 다운로드 (${count}개)`
    : `Download all (${count})`;
}

export const appLocale = getCurrentLocale();
export const appMessages = getMessages(appLocale);
