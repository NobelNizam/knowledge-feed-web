import type { Meta, StoryObj } from '@storybook/react';
import PremiumCard from './PremiumCard';

// Dummy context to bypass useAuth error in Storybook
const withAuthContext = (Story: any) => (
  <div style={{ maxWidth: '600px', width: '100%', padding: '20px' }}>
    <Story />
  </div>
);

const meta = {
  title: 'Components/PremiumCard',
  component: PremiumCard,
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [withAuthContext],
  tags: ['autodocs'],
} satisfies Meta<typeof PremiumCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ScienceDomain: Story = {
  args: {
    card: {
      id: '1',
      title: 'Mengenal Quantum Computing',
      content: 'Quantum computing adalah teknologi komputasi yang menggunakan prinsip-prinsip mekanika kuantum untuk memproses informasi. Tidak seperti komputer klasik yang menggunakan bit (0 atau 1), komputer kuantum menggunakan qubit yang dapat berada pada kedua state sekaligus (superposisi).',
      domain: 'science',
      tags: ['quantum', 'physics', 'computing'],
      viewCount: 1540,
      saveCount: 120,
    },
    isDetailView: false,
  },
};

export const HistoryDomain: Story = {
  args: {
    card: {
      id: '2',
      title: 'Sejarah Singkat Kekaisaran Romawi',
      content: 'Kekaisaran Romawi adalah periode pasca-Republik dari peradaban Romawi kuno, yang ditandai dengan pemerintahan otokratis dan wilayah yang sangat luas meliputi Eropa, Afrika Utara, dan Asia Barat. Mereka memengaruhi hukum dan budaya Eropa secara besar-besaran.',
      domain: 'history',
      tags: ['rome', 'ancient', 'europe'],
      viewCount: 890,
      saveCount: 45,
    },
    isDetailView: false,
  },
};

export const TechDomain: Story = {
  args: {
    card: {
      id: '3',
      title: 'Evolusi Kecerdasan Buatan',
      content: 'Sejak penemuan jaringan saraf tiruan awal hingga model transformer raksasa saat ini, AI telah mengubah cara kita bekerja dan berinteraksi. Inovasi seperti LLM membuka batas baru bagi produktivitas manusia.',
      domain: 'technology',
      tags: ['ai', 'machine-learning', 'future'],
      viewCount: 3200,
      saveCount: 840,
    },
    isDetailView: false,
  },
};
