import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

describe('Footer Component', () => {
    it('renders the brand name ReValuate', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );
        expect(screen.getByText('ReValuate')).toBeDefined();
    });

    it('contains the support email address', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );
        expect(screen.getAllByText('smartrevaluationsystem@gmail.com').length).toBeGreaterThan(0);
    });
});
