const map = document.getElementById('hazardMap');
const marker = document.getElementById('hazardCityMarker');
const hazardOptions = [...document.querySelectorAll('.hazard-option')];

if (!map || !marker || hazardOptions.length === 0) {
  throw new Error('No se pudo inicializar la pantalla de Hazard Area.');
}

export function createHazardMap({ onEnterCity }) {
  let selectedHazard = 'earthquake';

  function selectHazard(hazard) {
    selectedHazard = hazard;
    hazardOptions.forEach(option => {
      option.classList.toggle('is-selected', option.dataset.hazard === selectedHazard);
    });
  }

  hazardOptions.forEach(option => {
    if (!option.disabled) {
      option.addEventListener('click', () => selectHazard(option.dataset.hazard));
    }
  });

  marker.addEventListener('click', () => onEnterCity(selectedHazard));

  return {
    show() {
      map.classList.remove('is-hidden');
    },
    hide() {
      map.classList.add('is-hidden');
    }
  };
}
