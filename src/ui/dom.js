function getRequiredElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`No se encontró el elemento obligatorio #${id}.`);
  }

  return element;
}

export const dom = Object.freeze({
  app: getRequiredElement('app'),
  loading: getRequiredElement('loading'),
  loadingText: getRequiredElement('loadingText'),
  loadingBar: getRequiredElement('loadingBar'),

  buildingHotspots: getRequiredElement('buildingHotspots'),
  solutionHotspots: getRequiredElement('solutionHotspots'),

  preview: getRequiredElement('preview'),
  previewTitle: getRequiredElement('previewTitle'),
  previewCopy: getRequiredElement('previewCopy'),
  previewClose: getRequiredElement('previewClose'),

  playBtn: getRequiredElement('playBtn'),
  exploreBtn: getRequiredElement('exploreBtn'),

  backBtn: getRequiredElement('backBtn'),
  hint: getRequiredElement('hint'),
  crumbs: getRequiredElement('crumbs'),
  srStatus: getRequiredElement('srStatus'),

  modal: getRequiredElement('viewerModal'),
  closeViewerBtn: getRequiredElement('closeViewer'),
  sketchfabFrame: getRequiredElement('sketchfabFrame'),
  viewerTitle: getRequiredElement('viewerTitle'),
  viewerKicker: getRequiredElement('viewerKicker'),
  viewerBody: getRequiredElement('viewerBody'),
  providerName: getRequiredElement('providerName'),
  providerNote: getRequiredElement('providerNote'),
  providerLink: getRequiredElement('providerLink'),
  detailsLink: getRequiredElement('detailsLink'),
  specList: getRequiredElement('specList'),

  uiTitle: getRequiredElement('uiTitle'),
  uiSubtitle: getRequiredElement('uiSubtitle')
});
