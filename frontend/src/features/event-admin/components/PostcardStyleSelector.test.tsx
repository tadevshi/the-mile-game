import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostcardStyleSelector } from './PostcardStyleSelector';

afterEach(cleanup);

describe('PostcardStyleSelector', () => {
  it('exposes both styles as accessible radio controls with previews', () => {
    render(<PostcardStyleSelector value="classic" onChange={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /clásica/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /polaroid/i })).not.toBeChecked();
    expect(screen.getByRole('img', { name: /vista previa de postal clásica/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /vista previa de postal polaroid/i })).toBeInTheDocument();
  });

  it('reports the selected style', () => {
    const onChange = vi.fn();
    render(<PostcardStyleSelector value="classic" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /polaroid/i }));

    expect(onChange).toHaveBeenCalledWith('polaroid');
  });
});
