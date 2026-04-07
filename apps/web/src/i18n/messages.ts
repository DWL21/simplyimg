import type { ToolName } from '../types/image';

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
    footer: string;
  };
  home: {
    eyebrow: string;
    title: string;
    description: string;
    currentFeaturesTitle: string;
    currentFeaturesValue: string;
    currentFeaturesDescription: string;
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
  tools: Record<
    'compress' | 'resize' | 'convert',
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
  common: {
    none: string;
  };
};

const localeMessages: Record<'ko' | 'en', LocaleMessages> = {
  ko: {
    brand: {
      name: 'SimplyImg',
      tagline: 'simple image toolkit',
      footer: 'SimplyImg는 빠른 이미지 작업 흐름에 집중한 웹 도구입니다.',
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
      formats: 'JPG, PNG, WEBP, SVG, HEIC',
      title: '이미지 선택하기',
      description: '여러 파일을 한 번에 추가할 수 있습니다. 드래그 앤 드롭도 지원합니다.',
      button: '파일 고르기',
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
    common: {
      none: '-',
    },
  },
  en: {
    brand: {
      name: 'SimplyImg',
      tagline: 'simple image toolkit',
      footer: 'SimplyImg focuses on a fast and simple image workflow.',
    },
    home: {
      eyebrow: 'SIMPLYIMG',
      title: 'Pick a mode and start working on images right away.',
      description:
        'The entry screen only asks for the task. After entering a tool, you can upload multiple images, tune options in the right panel, and run the job immediately.',
      currentFeaturesTitle: 'Available now',
      currentFeaturesValue: 'Compress, Resize, Convert image formats',
      currentFeaturesDescription: 'Only the essential workflow stays visible.',
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
      formats: 'JPG, PNG, WEBP, SVG, HEIC',
      title: 'Select images',
      description: 'You can add multiple files at once. Drag and drop is supported too.',
      button: 'Choose files',
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
    common: {
      none: '-',
    },
  },
};

export type AppLocale = keyof typeof localeMessages;

export function resolveLocale(locale?: string): AppLocale {
  return locale === 'en' ? 'en' : 'ko';
}

export function getMessages(locale: string = 'ko') {
  return localeMessages[resolveLocale(locale)];
}

export function getToolCardEntries(locale: string = 'ko') {
  const messages = getMessages(locale);

  return (['compress', 'resize', 'convert'] as const).map((tool) => ({
    tool: tool as ToolName,
    path: `/${tool}`,
    ...messages.tools[tool],
  }));
}

export const appLocale = resolveLocale(import.meta.env.VITE_APP_LOCALE);
export const appMessages = getMessages(appLocale);
